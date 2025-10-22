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

  const language = useMemo(() => options.language || 'en-US', [options.language]);

  const disposeRecognizer = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (recognizer) {
      recognizer.close();
      recognizerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      interimResult: '',
      finalResult: '',
      error: null
    }));
  }, []);

  const stopRecording = useCallback(async () => {
    const recognizer = recognizerRef.current;
    if (!recognizer) {
      setState(prev => ({ ...prev, isRecording: false }));
      return;
    }

    await new Promise<void>((resolve, reject) => {
      recognizer.stopContinuousRecognitionAsync(
        () => {
          disposeRecognizer();
          setState(prev => ({ ...prev, isRecording: false }));
          resolve();
        },
        (error) => {
          disposeRecognizer();
          setState(prev => ({
            ...prev,
            isRecording: false,
            error: `Failed to stop voice capture: ${error}`
          }));
          reject(error);
        }
      );
    });
  }, [disposeRecognizer]);

  const startRecording = useCallback(async () => {
    if (recognizerRef.current) {
      return;
    }

    try {
      const recognizer = azureSpeechService.createSpeechRecognizer({ language });
      recognizerRef.current = recognizer;

      recognizer.recognizing = (_, event) => {
        if (event.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          setState(prev => ({
            ...prev,
            interimResult: event.result.text
          }));
        }
      };

      recognizer.recognized = (_, event) => {
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
        if (event.reason === SpeechSDK.CancellationReason.Error && event.errorDetails) {
          setState(prev => ({
            ...prev,
            error: `Voice capture canceled: ${event.errorDetails}`
          }));
        }
        disposeRecognizer();
        setState(prev => ({ ...prev, isRecording: false }));
      };

      recognizer.sessionStopped = () => {
        disposeRecognizer();
        setState(prev => ({ ...prev, isRecording: false }));
      };

      setState({
        isRecording: true,
        interimResult: '',
        finalResult: '',
        error: null
      });

      await new Promise<void>((resolve, reject) => {
        recognizer.startContinuousRecognitionAsync(
          () => resolve(),
          (error) => {
            disposeRecognizer();
            setState(prev => ({
              ...prev,
              isRecording: false,
              error: `Failed to start voice capture: ${error}`
            }));
            reject(error);
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error starting voice capture.';
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: errorMessage.startsWith('Speech service not initialized')
          ? 'Voice capture is unavailable. Please configure Azure Speech Service in the .env file.'
          : `Failed to access microphone: ${errorMessage}`
      }));
      disposeRecognizer();
    }
  }, [disposeRecognizer, language]);

  useEffect(() => {
    return () => {
      const recognizer = recognizerRef.current;
      if (recognizer) {
        recognizer.stopContinuousRecognitionAsync(
          () => disposeRecognizer(),
          () => disposeRecognizer()
        );
      } else {
        disposeRecognizer();
      }
    };
  }, [disposeRecognizer]);

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
