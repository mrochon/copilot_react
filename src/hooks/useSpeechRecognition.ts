import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { azureSpeechService } from '../AzureSpeechService';

interface UseSpeechRecognitionOptions {
  language?: string;
}

interface SpeechRecognitionState {
  isRecording: boolean;
  interimResult: string;
  finalResult: string;
  error: string | null;
}

const emptyState: SpeechRecognitionState = {
  isRecording: false,
  interimResult: '',
  finalResult: '',
  error: null
};

/**
 * Provides a simple wrapper around the Azure Speech SDK for microphone input.
 * Handles lifecycle of the recognizer so consuming components only need to start/stop it.
 */
export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
  const [state, setState] = useState<SpeechRecognitionState>(emptyState);
  const activeSessionRef = useRef<{ active: boolean }>({ active: false });
  const startInProgressRef = useRef<boolean>(false);
  const pendingStopRef = useRef<boolean>(false);

  const language = useMemo(() => options.language || 'en-US', [options.language]);

  const cleanupRecognizer = useCallback((target?: SpeechSDK.SpeechRecognizer | null) => {
    const recognizer = target ?? recognizerRef.current;
    activeSessionRef.current.active = false;
    startInProgressRef.current = false;
    pendingStopRef.current = false;

    if (!recognizer) {
      return;
    }

    if (recognizerRef.current === recognizer) {
      recognizerRef.current = null;
    }

    try {
      recognizer.close();
    } catch (error) {
      console.error('Error closing recognizer:', error);
    }
  }, []);

  const stopRecognizerInstance = useCallback((recognizer: SpeechSDK.SpeechRecognizer | null) => {
    if (!recognizer) {
      cleanupRecognizer(null);
      return;
    }

    const finalize = () => cleanupRecognizer(recognizer);

    try {
      recognizer.stopContinuousRecognitionAsync(
        () => finalize(),
        (error) => {
          console.error('Failed to stop voice capture:', error);
          finalize();
        }
      );
    } catch (error) {
      console.error('Failed to stop voice capture:', error);
      finalize();
    }
  }, [cleanupRecognizer]);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      interimResult: '',
      finalResult: '',
      error: null
    }));
  }, []);

  const stopRecording = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (!recognizer) {
      setState(prev => ({ ...prev, isRecording: false }));
      return;
    }

    // Immediately set recording to false (session stays active until cleanup)
    setState(prev => ({ ...prev, isRecording: false }));

    if (startInProgressRef.current) {
      pendingStopRef.current = true;
      return;
    }

    stopRecognizerInstance(recognizer);
  }, [stopRecognizerInstance]);

  const startRecording = useCallback(async () => {
    if (recognizerRef.current) {
      return;
    }

    try {
      const recognizer = azureSpeechService.createSpeechRecognizer({ language });
      recognizerRef.current = recognizer;

      // Create new session
      activeSessionRef.current = { active: true };
      startInProgressRef.current = true;
      pendingStopRef.current = false;

      recognizer.recognizing = (_, event) => {
        if (!activeSessionRef.current.active) return;
        if (event.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          setState(prev => ({
            ...prev,
            interimResult: event.result.text
          }));
        }
      };

      recognizer.recognized = (_, event) => {
        if (!activeSessionRef.current.active) return;
        if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          setState(prev => ({
            ...prev,
            interimResult: '',
            finalResult: prev.finalResult
              ? `${prev.finalResult} ${event.result.text}`.trim()
              : event.result.text,
          }));
        } else if (event.result.reason === SpeechSDK.ResultReason.NoMatch) {
          setState(prev => ({
            ...prev,
            error: 'No speech could be recognized. Please try again.'
          }));
        }
      };

      recognizer.canceled = (_, event) => {
        if (!activeSessionRef.current.active) return;
        if (event.reason === SpeechSDK.CancellationReason.Error && event.errorDetails) {
          setState(prev => ({
            ...prev,
            error: `Voice capture canceled: ${event.errorDetails}`
          }));
        }
        setState(prev => ({ ...prev, isRecording: false }));
        cleanupRecognizer(recognizer);
      };

      recognizer.sessionStopped = () => {
        if (!activeSessionRef.current.active) return;
        setState(prev => ({ ...prev, isRecording: false }));
        cleanupRecognizer(recognizer);
      };

      setState({
        isRecording: true,
        interimResult: '',
        finalResult: '',
        error: null
      });

      // Start recognition and resolve any pending stop requests
      recognizer.startContinuousRecognitionAsync(
        () => {
          startInProgressRef.current = false;
          if (pendingStopRef.current) {
            pendingStopRef.current = false;
            stopRecognizerInstance(recognizer);
          }
        },
        (error) => {
          startInProgressRef.current = false;
          pendingStopRef.current = false;
          cleanupRecognizer(recognizer);
          setState(prev => ({
            ...prev,
            isRecording: false,
            error: `Failed to start voice capture: ${error}`
          }));
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error starting voice capture.';
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: errorMessage.startsWith('Speech service not initialized')
          ? 'Voice capture is unavailable. Please configure Azure Speech Service in the .env file.'
          : `Failed to access microphone: ${errorMessage}`
      }));
      cleanupRecognizer();
    }
  }, [cleanupRecognizer, language, stopRecognizerInstance]);

  useEffect(() => {
    return () => {
      const recognizer = recognizerRef.current;
      if (recognizer) {
        stopRecognizerInstance(recognizer);
      } else {
        cleanupRecognizer();
      }
    };
  }, [cleanupRecognizer, stopRecognizerInstance]);

  return {
    isRecording: state.isRecording,
    interimResult: state.interimResult,
    finalResult: state.finalResult,
    error: state.error,
    startRecording,
    stopRecording,
    reset
  };
};
