import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { VisemeData } from '../AzureSpeechService';
import './Avatar.css';

interface MouthConfig {
  top?: string;
  left?: string;
  width?: string;
  height?: string;
}

interface AvatarProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  visemeData?: VisemeData[];
  audioBuffer?: ArrayBuffer;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  imageSrc?: string;
  mouthConfig?: MouthConfig;
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

const DEFAULT_MOUTH_CONFIG: Required<MouthConfig> = {
  top: '68%',
  left: '50%',
  width: '22%',
  height: '14%',
};

export const Avatar: React.FC<AvatarProps> = ({
  isListening = false,
  isSpeaking = false,
  visemeData = [],
  audioBuffer,
  onSpeechStart,
  onSpeechEnd,
  imageSrc,
  mouthConfig,
}) => {
  const [currentMouthShape, setCurrentMouthShape] = useState<string>('neutral');
  const [eyeBlinkState, setEyeBlinkState] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const objectUrlRef = useRef<string | null>(null);

  const mergedMouthConfig = useMemo(() => ({
    top: mouthConfig?.top ?? DEFAULT_MOUTH_CONFIG.top,
    left: mouthConfig?.left ?? DEFAULT_MOUTH_CONFIG.left,
    width: mouthConfig?.width ?? DEFAULT_MOUTH_CONFIG.width,
    height: mouthConfig?.height ?? DEFAULT_MOUTH_CONFIG.height,
  }), [mouthConfig]);

  const photoMouthStyle = useMemo<CSSProperties | undefined>(() => {
    if (!imageSrc) {
      return undefined;
    }
    const transform = PHOTO_MOUTH_TRANSFORMS[currentMouthShape] ?? PHOTO_MOUTH_TRANSFORMS.neutral;
    const rotate = transform.rotate ? ` rotate(${transform.rotate})` : '';
    return {
      top: mergedMouthConfig.top,
      left: mergedMouthConfig.left,
      width: mergedMouthConfig.width,
      height: mergedMouthConfig.height,
      transform: `translate(-50%, -50%) scale(${transform.scaleX}, ${transform.scaleY})${rotate}`,
    };
  }, [currentMouthShape, mergedMouthConfig, imageSrc]);

  const animateVisemes = useCallback(() => {
    if (!visemeData.length) {
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
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
      const mouthShape = VISEME_MOUTH_SHAPES[activeViseme.visemeId] || 'neutral';
      setCurrentMouthShape(mouthShape);
    }

    animationRef.current = requestAnimationFrame(animateVisemes);
  }, [visemeData]);

  const playAudioWithVisemes = useCallback(async () => {
    if (!audioBuffer || !audioRef.current) {
      return;
    }

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      objectUrlRef.current = audioUrl;
      audioRef.current.src = audioUrl;

      onSpeechStart?.();
      await audioRef.current.play();

      if (visemeData.length > 0) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        startTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(animateVisemes);
      } else {
        setCurrentMouthShape('aa');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      onSpeechEnd?.();
      setCurrentMouthShape('neutral');
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    }
  }, [audioBuffer, visemeData, onSpeechStart, onSpeechEnd, animateVisemes]);

  useEffect(() => {
    if (audioBuffer) {
      playAudioWithVisemes();
    }
  }, [audioBuffer, playAudioWithVisemes]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return undefined;
    }

    const handleEnded = () => {
      setCurrentMouthShape('neutral');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      onSpeechEnd?.();
    };

    audioElement.addEventListener('ended', handleEnded);
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [onSpeechEnd]);

  // Eye blinking animation remains for stylised fallback
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlinkState(true);
      setTimeout(() => setEyeBlinkState(false), 150);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (!isSpeaking) {
      setCurrentMouthShape('neutral');
    }
  }, [isSpeaking]);

  useEffect(() => () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const renderStylisedFace = () => (
    <>
      <div className={`avatar-eye avatar-eye-left ${eyeBlinkState ? 'blinking' : ''}`}>
        <div className="avatar-pupil" />
      </div>
      <div className={`avatar-eye avatar-eye-right ${eyeBlinkState ? 'blinking' : ''}`}>
        <div className="avatar-pupil" />
      </div>
      <div className={`avatar-mouth mouth-${currentMouthShape} ${isSpeaking ? 'speaking' : ''}`}>
        <div className="mouth-inner" />
      </div>
    </>
  );

  const renderPhotoFace = () => (
    <>
      <div className="avatar-photo-wrapper">
        {imageSrc && <img src={imageSrc} alt="AI assistant" className="avatar-photo" />}
      </div>
      <div className={`avatar-mouth-overlay ${isSpeaking ? 'speaking' : ''}`} style={photoMouthStyle}>
        <div className="avatar-mouth-overlay-inner" />
      </div>
    </>
  );

  return (
    <div className={`avatar-container ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
      <div className={`avatar-face ${imageSrc ? 'avatar-face-photo' : ''}`}>
        {imageSrc ? renderPhotoFace() : renderStylisedFace()}

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
};