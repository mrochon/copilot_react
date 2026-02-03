import { useState, useEffect, useCallback, useRef } from 'react';
import { azureSpeechService } from '../AzureSpeechService';
import { elevenLabsTTSService } from '../ElevenLabsTTSService';
import { TTSService } from '../TTSService';
import type { VisemeData } from '../TTSService';

type TTSProvider = 'azure' | 'elevenlabs';

interface UseSpeechAvatarConfig {
  ttsProvider?: TTSProvider;
  // Azure-specific config
  speechKey?: string;
  speechRegion?: string;
  voiceName?: string;
  // ElevenLabs-specific config
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  elevenLabsModel?: string;
  // ElevenLabs chunking config (to fix volume issues on long strings)
  elevenLabsChunkingEnabled?: boolean;
  elevenLabsMaxChunkLength?: number;
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
  const isCancelled = useRef<boolean>(false);

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
              error: 'ElevenLabs API key not configured. Please set REACT_APP_ELEVENLABS_API_KEY in your .env file.'
            }));
            return;
          }

          elevenLabsTTSService.initialize({
            apiKey: config.elevenLabsApiKey,
            voiceId: config.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
            model: config.elevenLabsModel || 'eleven_multilingual_v2',
            chunkingEnabled: config.elevenLabsChunkingEnabled,
            maxChunkLength: config.elevenLabsMaxChunkLength
          });

          service = elevenLabsTTSService;
          console.log('ElevenLabs TTS service initialized successfully');

          // Also initialize Azure Speech Service for speech recognition (voice input)
          // even when using ElevenLabs for TTS (voice output)
          if (config.speechKey && config.speechKey !== 'YOUR_AZURE_SPEECH_KEY') {
            azureSpeechService.initialize({
              subscriptionKey: config.speechKey,
              region: config.speechRegion || 'eastus',
              voiceName: config.voiceName || 'en-US-JennyNeural'
            });
            console.log('Azure Speech Service also initialized for voice input/recognition');
          }
        } else {
          // Initialize Azure Speech for both TTS and recognition
          if (!config.speechKey || config.speechKey === 'YOUR_AZURE_SPEECH_KEY') {
            setState(prev => ({
              ...prev,
              error: 'Azure Speech Service key not configured. Please set REACT_APP_SPEECH_KEY in your .env file.'
            }));
            return;
          }

          azureSpeechService.initialize({
            subscriptionKey: config.speechKey,
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
  }, [provider, config.speechKey, config.speechRegion, config.voiceName, config.elevenLabsApiKey, config.elevenLabsVoiceId, config.elevenLabsModel]);



  // Cancel speech (clear queue and stop)
  const cancelSpeech = useCallback(() => {
    console.log('Cancelling speech...');
    isCancelled.current = true;
    setState(prev => ({
      ...prev,
      isSpeaking: false,
      visemeData: [],
      audioBuffer: null
    }));
  }, []);

  // Speak text with lip-sync
  const speakWithLipSync = useCallback(async (text: string): Promise<number> => {
    if (!state.isInitialized || !ttsService) {
      throw new Error('Speech service not initialized');
    }

    if (!text.trim()) {
      console.warn('Empty text provided for speech synthesis');
      return 0;
    }

    // Reset cancellation state
    isCancelled.current = false;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      console.log('Starting speech synthesis...');

      const result = await ttsService.synthesizeSpeechWithVisemes(text);

      if (isCancelled.current) {
        console.log('Speech cancelled after synthesis, discarding result');
        setState(prev => ({ ...prev, isLoading: false }));
        return 0;
      }

      console.log(`Speech synthesis complete. Duration: ${result.duration}ms`);

      setState(prev => ({
        ...prev,
        isLoading: false,
        isSpeaking: true,
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

  // Speak text without lip-sync (simple fallback)
  const speakWithoutLipSync = useCallback(async (text: string): Promise<void> => {
    if (!state.isInitialized || !ttsService) {
      throw new Error('Speech service not initialized');
    }

    if (!text.trim()) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await ttsService.synthesizeSpeechOnly(text);
      setState(prev => ({
        ...prev,
        isLoading: false,
        visemeData: [],
        audioBuffer: result.audioBuffer
      }));
    } catch (error) {
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
    // Called when the audio player (Avatar) finishes the current buffer
    // Since we no longer chunk, we are done
    console.log('All chunks finished or cancelled.');
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
    cancelSpeech,
    clearError
  };
};