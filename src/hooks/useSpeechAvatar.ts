import { useState, useEffect, useCallback } from 'react';
import { azureSpeechService } from '../AzureSpeechService';
import { elevenLabsTTSService } from '../ElevenLabsTTSService';
import { TTSService } from '../TTSService';
import type { VisemeData } from '../TTSService';

type TTSProvider = 'azure' | 'elevenlabs';

interface UseSpeechAvatarConfig {
  ttsProvider?: TTSProvider;
  // Azure-specific config
  speechRegion?: string;
  voiceName?: string;
  getSpeechToken?: () => Promise<string | null>;
  // ElevenLabs-specific config
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  elevenLabsModel?: string;
}

interface SpeechAvatarState {
  isInitialized: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  visemeData: VisemeData[];
  audioBuffer: ArrayBuffer | null;
}

export const useSpeechAvatar = (config: UseSpeechAvatarConfig) => {
  const [state, setState] = useState<SpeechAvatarState>({
    isInitialized: false,
    isSpeaking: false,
    isLoading: false,
    error: null,
    visemeData: [],
    audioBuffer: null
  });

  const [ttsService, setTtsService] = useState<TTSService | null>(null);
  const provider = config.ttsProvider || 'azure';

  // Initialize speech service
  useEffect(() => {
    const initializeSpeech = async () => {
      try {
        let service: TTSService;

        if (provider === 'elevenlabs') {
          // Initialize ElevenLabs for TTS
          if (!config.elevenLabsApiKey || config.elevenLabsApiKey === 'YOUR_ELEVENLABS_API_KEY') {
            setState(prev => ({ 
              ...prev, 
              error: 'ElevenLabs API key not configured. Please set VITE_ELEVENLABS_API_KEY in your .env file.' 
            }));
            return;
          }

          await elevenLabsTTSService.initialize({
            apiKey: config.elevenLabsApiKey,
            voiceId: config.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
            model: config.elevenLabsModel || 'eleven_multilingual_v2'
          });

          service = elevenLabsTTSService;
          console.log('ElevenLabs TTS service initialized successfully');

          // Also initialize Azure Speech Service for speech recognition (voice input)
          // even when using ElevenLabs for TTS (voice output)
          if (config.getSpeechToken) {
            await azureSpeechService.initialize({
              getAuthorizationToken: async () => {
                const token = await config.getSpeechToken?.();
                if (!token) {
                  throw new Error('Unable to obtain Azure Speech access token');
                }
                return token;
              },
              region: config.speechRegion || 'eastus',
              voiceName: config.voiceName || 'en-US-JennyNeural'
            });
            console.log('Azure Speech Service also initialized for voice input/recognition');
          }
        } else {
          // Initialize Azure Speech for both TTS and recognition
          if (!config.getSpeechToken) {
            setState(prev => ({ 
              ...prev, 
              error: 'Azure Speech Service OAuth not configured. Please ensure VITE_SPEECH_SCOPE is set and that you are signed in with permissions for Cognitive Services.' 
            }));
            return;
          }

          await azureSpeechService.initialize({
            getAuthorizationToken: async () => {
              const token = await config.getSpeechToken?.();
              if (!token) {
                throw new Error('Unable to obtain Azure Speech access token');
              }
              return token;
            },
            region: config.speechRegion || 'eastus',
            voiceName: config.voiceName || 'en-US-JennyNeural'
          });

          service = azureSpeechService;
          console.log('Azure Speech Service initialized successfully');
        }

        setTtsService(service);
        setState(prev => ({ 
          ...prev, 
          isInitialized: true, 
          error: null 
        }));

        console.log(`Speech avatar service initialized successfully with provider: ${provider}`);
      } catch (error) {
        console.error('Failed to initialize speech service:', error);
        setState(prev => ({ 
          ...prev, 
          error: `Failed to initialize speech service: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }));
      }
    };

    initializeSpeech();

    // Cleanup on unmount
    return () => {
      if (provider === 'azure') {
        azureSpeechService.dispose();
      } else if (provider === 'elevenlabs') {
        elevenLabsTTSService.dispose();
      }
    };
  }, [provider, config.getSpeechToken, config.speechRegion, config.voiceName, config.elevenLabsApiKey, config.elevenLabsVoiceId, config.elevenLabsModel]);

  // Speak text with lip-sync
  const speakWithLipSync = useCallback(async (text: string): Promise<number> => {
    if (!state.isInitialized || !ttsService) {
      throw new Error('Speech service not initialized');
    }

    if (!text.trim()) {
      console.warn('Empty text provided for speech synthesis');
      return 0;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      console.log('Synthesizing speech with visemes for text:', text);
      
      const result = await ttsService.synthesizeSpeechWithVisemes(text);
      
      console.log(`Speech synthesis completed. Duration: ${result.duration}ms, Visemes: ${result.visemeData.length}, AudioBuffer size: ${result.audioBuffer.byteLength}`);
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        visemeData: result.visemeData,
        audioBuffer: result.audioBuffer
      }));

      return result.duration;
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: `Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
      return 0;
    }
  }, [state.isInitialized, ttsService]);

  // Speak text without lip-sync (faster)
  const speakWithoutLipSync = useCallback(async (text: string): Promise<void> => {
    if (!state.isInitialized || !ttsService) {
      throw new Error('Speech service not initialized');
    }

    if (!text.trim()) {
      console.warn('Empty text provided for speech synthesis');
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      console.log('Synthesizing speech (no visemes) for text:', text);
      
      const result = await ttsService.synthesizeSpeechOnly(text);
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        visemeData: [],
        audioBuffer: result.audioBuffer
      }));

      console.log('Speech synthesis completed (no lip-sync)');
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: `Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  }, [state.isInitialized, ttsService]);

  // Speech event handlers
  const handleSpeechStart = useCallback(() => {
    setState(prev => ({ ...prev, isSpeaking: true }));
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isSpeaking: false,
      visemeData: [],
      audioBuffer: null 
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isInitialized: state.isInitialized,
    isSpeaking: state.isSpeaking,
    isLoading: state.isLoading,
    error: state.error,
    visemeData: state.visemeData,
    audioBuffer: state.audioBuffer,
    
    // Actions
    speakWithLipSync,
    speakWithoutLipSync,
    handleSpeechStart,
    handleSpeechEnd,
    clearError
  };
};