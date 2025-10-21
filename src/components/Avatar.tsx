import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VisemeData } from '../AzureSpeechService';
import './Avatar.css';

interface AvatarProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  visemeData?: VisemeData[];
  audioBuffer?: ArrayBuffer;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

// Viseme ID to mouth shape mapping (simplified)
const VISEME_MOUTH_SHAPES: { [key: number]: string } = {
  0: 'neutral',     // silence
  1: 'aa',          // aa (father)
  2: 'aa',          // aa (father) 
  3: 'oh',          // ao (thought)
  4: 'ay',          // ay (hide)
  5: 'eh',          // eh (bed)
  6: 'er',          // er (bird)
  7: 'ih',          // ih (bit)
  8: 'ih',          // iy (beat)
  9: 'oh',          // oh (boat)
  10: 'ow',         // ow (bout)
  11: 'oy',         // oy (boy)
  12: 'p',          // p (put)
  13: 'b',          // b (but)
  14: 't',          // t (take)
  15: 'd',          // d (day)
  16: 'k',          // k (kick)
  17: 'g',          // g (go)
  18: 'f',          // f (four)
  19: 'v',          // v (very)
  20: 'th',         // th (think)
  21: 'th',         // th (that)
  22: 's',          // s (say)
  23: 'z',          // z (zoo)
  24: 'sh',         // sh (shore)
  25: 'zh',         // zh (measure)
  26: 'n',          // n (no)
  27: 'l',          // l (low)
  28: 'r',          // r (red)
  29: 'w',          // w (way)
  30: 'y',          // y (yes)
  31: 'h',          // h (how)
};

export const Avatar: React.FC<AvatarProps> = ({
  isListening = false,
  isSpeaking = false,
  visemeData = [],
  audioBuffer,
  onSpeechStart,
  onSpeechEnd
}) => {
  const [currentMouthShape, setCurrentMouthShape] = useState<string>('neutral');
  const [eyeBlinkState, setEyeBlinkState] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // Handle audio playback with viseme synchronization
  useEffect(() => {
    if (audioBuffer && visemeData.length > 0) {
      playAudioWithVisemes();
    }
  }, [audioBuffer, visemeData]);

  const playAudioWithVisemes = useCallback(async () => {
    if (!audioBuffer) return;

    try {
      // Create audio from buffer
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        // Start audio playback
        onSpeechStart?.();
        await audioRef.current.play();
        
        // Start viseme animation
        startTimeRef.current = Date.now();
        animateVisemes();
        
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      onSpeechEnd?.();
    }
  }, [audioBuffer, visemeData, onSpeechStart, onSpeechEnd]);

  const animateVisemes = useCallback(() => {
    const currentTime = Date.now() - startTimeRef.current;
    
    // Find the current viseme based on timing
    const currentViseme = visemeData.find((viseme, index) => {
      const nextViseme = visemeData[index + 1];
      return currentTime >= viseme.audioOffset && 
             (!nextViseme || currentTime < nextViseme.audioOffset);
    });

    if (currentViseme) {
      const mouthShape = VISEME_MOUTH_SHAPES[currentViseme.visemeId] || 'neutral';
      setCurrentMouthShape(mouthShape);
    }

    // Continue animation if still speaking
    if (isSpeaking) {
      animationRef.current = requestAnimationFrame(animateVisemes);
    }
  }, [visemeData, isSpeaking]);

  // Handle audio end
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => {
        setCurrentMouthShape('neutral');
        onSpeechEnd?.();
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };

      audio.addEventListener('ended', handleEnded);
      return () => {
        audio.removeEventListener('ended', handleEnded);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [onSpeechEnd]);

  // Eye blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlinkState(true);
      setTimeout(() => setEyeBlinkState(false), 150);
    }, 2000 + Math.random() * 3000); // Random blink every 2-5 seconds

    return () => clearInterval(blinkInterval);
  }, []);

  // Reset mouth shape when not speaking
  useEffect(() => {
    if (!isSpeaking) {
      setCurrentMouthShape('neutral');
    }
  }, [isSpeaking]);

  return (
    <div className={`avatar-container ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
      <div className="avatar-face">
        {/* Eyes */}
        <div className={`avatar-eye avatar-eye-left ${eyeBlinkState ? 'blinking' : ''}`}>
          <div className="avatar-pupil"></div>
        </div>
        <div className={`avatar-eye avatar-eye-right ${eyeBlinkState ? 'blinking' : ''}`}>
          <div className="avatar-pupil"></div>
        </div>
        
        {/* Mouth with viseme-based shapes */}
        <div className={`avatar-mouth mouth-${currentMouthShape} ${isSpeaking ? 'speaking' : ''}`}>
          <div className="mouth-inner"></div>
        </div>

        {/* Listening indicator */}
        {isListening && (
          <div className="listening-indicator">
            <div className="sound-wave"></div>
            <div className="sound-wave"></div>
            <div className="sound-wave"></div>
          </div>
        )}
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};