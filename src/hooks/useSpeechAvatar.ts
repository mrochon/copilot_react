import { useState, useEffect, useCallback } from 'react';
import { azureSpeechService, VisemeData } from '../AzureSpeechService';

interface UseSpeechAvatarConfig {
  speechKey: string;
  speechRegion: string;
  voiceName?: string;
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

  // Initialize speech service
  useEffect(() => {
    const initializeSpeech = async () => {
      try {
        if (!config.speechKey || config.speechKey === 'YOUR_AZURE_SPEECH_KEY') {
          setState(prev => ({ 
            ...prev, 
            error: 'Azure Speech Service key not configured. Please set REACT_APP_SPEECH_KEY in your .env file.' 
          }));
          return;
        }

        azureSpeechService.initialize({
          subscriptionKey: config.speechKey,
          region: config.speechRegion,
          voiceName: config.voiceName || 'en-US-JennyNeural'
        });

        setState(prev => ({ 
          ...prev, 
          isInitialized: true, 
          error: null 
        }));

        console.log('Speech avatar service initialized successfully');
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
      azureSpeechService.dispose();
    };
  }, [config.speechKey, config.speechRegion, config.voiceName]);

  // Speak text with lip-sync
  const speakWithLipSync = useCallback(async (text: string): Promise<number> => {
    if (!state.isInitialized) {
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
      
      const result = await azureSpeechService.synthesizeSpeechWithVisemes(text);
      
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
  }, [state.isInitialized]);

  // Speak text without lip-sync (faster)
  const speakWithoutLipSync = useCallback(async (text: string): Promise<number> => {
    if (!state.isInitialized) {
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
      console.log('Synthesizing speech (no visemes) for text:', text);
      
      const result = await azureSpeechService.synthesizeSpeechOnly(text);
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        visemeData: [],
        audioBuffer: result.audioBuffer
      }));

      console.log('Speech synthesis completed (no lip-sync)');
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
  }, [state.isInitialized]);

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