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
  const chunksQueue = useRef<string[]>([]);
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
            model: config.elevenLabsModel || 'eleven_multilingual_v2'
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

  // Helper to process the next chunk in the queue
  const processNextChunk = useCallback(async () => {
    if (!ttsService || chunksQueue.current.length === 0 || isCancelled.current) {
      if (chunksQueue.current.length === 0 && !isCancelled.current) {
        // Naturally finished all chunks, ensure state is clean
        // We do WAIT for audio to end (handleSpeechEnd calls this), so we are truly done here?
        // No, processNextChunk is called either initially OR when previous chunk ended.
        // If queue is empty here, it means we just finished the last chunk (called from handleSpeechEnd)
        // OR we had no chunks to begin with.

        setState(prev => ({
          ...prev,
          isSpeaking: false,
          visemeData: [],
          audioBuffer: null
        }));
      }
      return;
    }

    const nextChunk = chunksQueue.current.shift();
    if (!nextChunk) return;

    try {
      console.log(`Processing next TTS chunk (${chunksQueue.current.length} remaining): "${nextChunk.substring(0, 20)}..."`);

      const result = await ttsService.synthesizeSpeechWithVisemes(nextChunk);

      if (isCancelled.current) {
        console.log('Speech cancelled after synthesis, discarding result');
        return;
      }

      console.log(`Chunk synthesis complete.`);

      setState(prev => ({
        ...prev,
        isLoading: false,
        isSpeaking: true, // Ensure we stay in speaking state
        visemeData: result.visemeData,
        audioBuffer: result.audioBuffer
      }));

    } catch (error) {
      console.error('Chunk synthesis failed:', error);
      // For now, let's stop and report error
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Speech chunk synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isSpeaking: false
      }));
      chunksQueue.current = []; // Clear remaining
    }
  }, [ttsService]);

  // Cancel speech (clear queue and stop)
  const cancelSpeech = useCallback(() => {
    console.log('Cancelling speech...');
    isCancelled.current = true;
    chunksQueue.current = [];
    setState(prev => ({
      ...prev,
      isSpeaking: false,
      visemeData: [],
      audioBuffer: null
    }));
  }, []);

  // Speak text with lip-sync (chunked)
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
    chunksQueue.current = [];

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {

      // No chunking for any provider - process full text to avoid skipping issues
      chunksQueue.current = [text];

      console.log(`Processing full text as single chunk`);

      // Calculate estimated total duration (approx 15 chars per sec = 66ms per char)
      const estimatedDuration = Math.round(text.length / 15 * 1000);

      // Start processing the first chunk immediately
      if (chunksQueue.current.length > 0) {
        void processNextChunk();
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }

      return estimatedDuration;
    } catch (error) {
      console.error('Speech synthesis setup failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      return 0;
    }
  }, [state.isInitialized, ttsService, processNextChunk]);

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
    // Check if we have more chunks
    if (chunksQueue.current.length > 0 && !isCancelled.current) {
      console.log('Chunk finished, fetching/playing next chunk...');
      void processNextChunk();
    } else {
      console.log('All chunks finished or cancelled.');
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        visemeData: [],
        audioBuffer: null
      }));
    }
  }, [processNextChunk]);

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