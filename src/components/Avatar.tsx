import React, { useRef, useEffect, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { VisemeData } from '../AzureSpeechService';
import './Avatar.css';



interface AvatarProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  visemeData?: VisemeData[];
  audioBuffer?: ArrayBuffer;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onStopSpeech?: () => void;
  imageSrc?: string;
}

export interface AvatarRef {
  stopSpeech: () => void;
}



type PhotoMouthTransform = {
  scaleX: number;
  scaleY: number;
  rotate?: string;
};

// Viseme ID to mouth shape mapping (simplified)
const VISEME_MOUTH_SHAPES: { [key: number]: string } = {
  0: 'neutral',
  1: 'aa',
  2: 'aa',
  3: 'oh',
  4: 'ay',
  5: 'eh',
  6: 'er',
  7: 'ih',
  8: 'ih',
  9: 'oh',
  10: 'ow',
  11: 'oy',
  12: 'p',
  13: 'b',
  14: 't',
  15: 'd',
  16: 'k',
  17: 'g',
  18: 'f',
  19: 'v',
  20: 'th',
  21: 'th',
  22: 's',
  23: 'z',
  24: 'sh',
  25: 'zh',
  26: 'n',
  27: 'l',
  28: 'r',
  29: 'w',
  30: 'y',
  31: 'h',
};

const PHOTO_MOUTH_TRANSFORMS: Record<string, PhotoMouthTransform> = {
  neutral: { scaleX: 1, scaleY: 0.55 },
  aa: { scaleX: 1.4, scaleY: 1.05 },
  oh: { scaleX: 0.95, scaleY: 1.4 },
  ay: { scaleX: 1.6, scaleY: 0.75 },
  eh: { scaleX: 1.4, scaleY: 0.85 },
  er: { scaleX: 1.2, scaleY: 0.6 },
  ih: { scaleX: 1.3, scaleY: 0.6 },
  ow: { scaleX: 1.05, scaleY: 1.3 },
  oy: { scaleX: 1.1, scaleY: 1.1 },
  p: { scaleX: 1.45, scaleY: 0.35 },
  b: { scaleX: 1.45, scaleY: 0.35 },
  t: { scaleX: 1.35, scaleY: 0.4 },
  d: { scaleX: 1.35, scaleY: 0.4 },
  k: { scaleX: 1.25, scaleY: 0.45 },
  g: { scaleX: 1.25, scaleY: 0.45 },
  f: { scaleX: 1.55, scaleY: 0.45 },
  v: { scaleX: 1.55, scaleY: 0.45 },
  th: { scaleX: 1.5, scaleY: 0.4 },
  s: { scaleX: 1.3, scaleY: 0.4 },
  z: { scaleX: 1.3, scaleY: 0.4 },
  sh: { scaleX: 1.05, scaleY: 0.85 },
  zh: { scaleX: 1.05, scaleY: 0.85 },
  n: { scaleX: 1.35, scaleY: 0.6 },
  l: { scaleX: 1.35, scaleY: 0.6 },
  r: { scaleX: 1.2, scaleY: 0.65 },
  w: { scaleX: 0.95, scaleY: 0.9 },
  y: { scaleX: 1.15, scaleY: 0.7 },
  h: { scaleX: 1.25, scaleY: 0.85 },
};

export const Avatar = forwardRef<AvatarRef, AvatarProps>(({
  isListening = false,
  isSpeaking = false,
  visemeData = [],
  audioBuffer,
  onSpeechStart,
  onSpeechEnd,
  onStopSpeech,
  imageSrc,
}, ref) => {
  const [currentMouthShape, setCurrentMouthShape] = useState<string>('neutral');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastProcessedBufferRef = useRef<ArrayBuffer | null>(null);
  const pendingResumeHandlerRef = useRef<(() => void) | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const animateVisemes = useCallback(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !visemeData.length) {
      animationRef.current = null;
      return;
    }

    const elapsed = audioElement.currentTime * 1000;
    let activeViseme = visemeData[visemeData.length - 1];

    for (let index = 0; index < visemeData.length; index += 1) {
      const current = visemeData[index];
      const next = visemeData[index + 1];

      if (elapsed >= current.audioOffset && (!next || elapsed < next.audioOffset)) {
        activeViseme = current;
        break;
      }
    }

    if (activeViseme) {
      const MAX_VISEME_DURATION = 300;
      const timeSinceVisemeStart = elapsed - activeViseme.audioOffset;

      if (timeSinceVisemeStart > MAX_VISEME_DURATION) {
        setCurrentMouthShape('neutral');
      } else {
        const mouthShape = VISEME_MOUTH_SHAPES[activeViseme.visemeId] || 'neutral';
        setCurrentMouthShape(mouthShape);
      }
    }

    animationRef.current = requestAnimationFrame(animateVisemes);
  }, [visemeData]);

  const playAudioWithVisemes = useCallback(async () => {
    if (!audioBuffer || !audioRef.current) {
      return;
    }

    if (pendingResumeHandlerRef.current) {
      document.removeEventListener('pointerdown', pendingResumeHandlerRef.current);
      document.removeEventListener('keydown', pendingResumeHandlerRef.current);
      pendingResumeHandlerRef.current = null;
    }

    const startPlayback = async (): Promise<void> => {
      const element = audioRef.current;
      if (!element) return;

      try {
        await element.play();
        onSpeechStart?.();

        if (visemeData.length > 0) {
          animationRef.current = requestAnimationFrame(animateVisemes);
        } else {
          setCurrentMouthShape('aa');
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          console.warn('Audio playback blocked until user interaction.');
          onSpeechEnd?.();

          if (!pendingResumeHandlerRef.current) {
            const resume = async () => {
              document.removeEventListener('pointerdown', resume);
              document.removeEventListener('keydown', resume);
              pendingResumeHandlerRef.current = null;

              try {
                await startPlayback();
              } catch (resumeError) {
                console.error('Failed to resume audio after user interaction:', resumeError);
                onSpeechEnd?.();
                setCurrentMouthShape('neutral');
                cleanupObjectUrl();
              }
            };

            pendingResumeHandlerRef.current = resume;
            document.addEventListener('pointerdown', resume, { once: true });
            document.addEventListener('keydown', resume, { once: true });
          }

          return;
        }
        throw error;
      }
    };

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      cleanupObjectUrl();

      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      objectUrlRef.current = audioUrl;
      audioRef.current.src = audioUrl;

      console.log('Avatar: New audioBuffer received, preparing playback. Size:', audioBuffer.byteLength);
      await startPlayback();
    } catch (error) {
      console.error('Error playing audio:', error);
      onSpeechEnd?.();
      setCurrentMouthShape('neutral');
      cleanupObjectUrl();
    }
  }, [audioBuffer, visemeData, animateVisemes, onSpeechStart, onSpeechEnd, cleanupObjectUrl]);

  const stopSpeech = useCallback(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }


    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (pendingResumeHandlerRef.current) {
      document.removeEventListener('pointerdown', pendingResumeHandlerRef.current);
      document.removeEventListener('keydown', pendingResumeHandlerRef.current);
      pendingResumeHandlerRef.current = null;
    }

    setCurrentMouthShape('neutral');
    cleanupObjectUrl();

    onSpeechEnd?.();
    onStopSpeech?.();
  }, [onSpeechEnd, onStopSpeech, cleanupObjectUrl]);

  useImperativeHandle(ref, () => ({
    stopSpeech
  }), [stopSpeech]);

  useEffect(() => {
    if (!audioBuffer) {
      lastProcessedBufferRef.current = null;
      return;
    }

    if (lastProcessedBufferRef.current === audioBuffer) {
      return;
    }

    lastProcessedBufferRef.current = audioBuffer;
    void playAudioWithVisemes();
  }, [audioBuffer, playAudioWithVisemes]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return undefined;
    }

    const handleEnded = () => {
      cleanupObjectUrl();
      onSpeechEnd?.();
    };

    audioElement.addEventListener('ended', handleEnded);
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [onSpeechEnd]);

  useEffect(() => () => {

    if (pendingResumeHandlerRef.current) {
      document.removeEventListener('pointerdown', pendingResumeHandlerRef.current);
      document.removeEventListener('keydown', pendingResumeHandlerRef.current);
      pendingResumeHandlerRef.current = null;
    }

    cleanupObjectUrl();
  }, [cleanupObjectUrl]);

  const displayImageSrc = isSpeaking
    ? (import.meta.env.VITE_AVATAR_SPEAKING_IMAGE || '/avatars/agent5.gif')
    : (import.meta.env.VITE_AVATAR_IDLE_IMAGE || '/avatars/agent4.gif');

  const renderPhotoFace = () => {
    // Only apply if we have a valid shape (though we default to neutral)
    const transform = PHOTO_MOUTH_TRANSFORMS[currentMouthShape] ?? PHOTO_MOUTH_TRANSFORMS.neutral;
    const rotate = transform.rotate ? ` rotate(${transform.rotate})` : '';

    // Base position from env vars
    const baseStyle: React.CSSProperties = {
      top: import.meta.env.VITE_AVATAR_MOUTH_TOP,
      left: import.meta.env.VITE_AVATAR_MOUTH_LEFT,
      width: import.meta.env.VITE_AVATAR_MOUTH_WIDTH,
      height: import.meta.env.VITE_AVATAR_MOUTH_HEIGHT,
      // Apply the viseme transform. Note: translate(-50%, -50%) handles the centering.
      transform: `translate(-50%, -50%) scale(${transform.scaleX}, ${transform.scaleY})${rotate}`,
      // Disable the CSS fallback animation when we are driving it with Visemes
      animation: 'none',
      // Smooth the transitions to avoid quivering
      transition: `transform ${import.meta.env.VITE_AVATAR_TRANSITION_DURATION || '0.15s'} ease-out`,
    };

    return (
      <div className="avatar-photo-wrapper">
        <img src={displayImageSrc} alt="AI assistant" className="avatar-photo" />
        {isSpeaking && (
          <div
            className="avatar-mouth-overlay"
            style={baseStyle}
          />
        )}
        <div className="avatar-photo-depth" />
        <div className="avatar-photo-highlight" />
        <div className="avatar-photo-shadow" />
        <div className="avatar-photo-glow" />
        <div className="avatar-photo-outline" />
        <div className="avatar-photo-gloss" />
      </div>
    );
  };

  return (
    <div className={`avatar-container ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
      <div className={`avatar-face avatar-face-photo`}>
        {renderPhotoFace()}

        {isListening && (
          <div className="listening-indicator">
            <div className="sound-wave" />
            <div className="sound-wave" />
            <div className="sound-wave" />
          </div>
        )}
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
});

Avatar.displayName = 'Avatar';