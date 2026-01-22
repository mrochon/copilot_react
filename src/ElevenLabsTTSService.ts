import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { TTSService, TTSResult, VisemeData } from './TTSService';

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  model?: string;
}

export class ElevenLabsTTSService implements TTSService {
  private client: ElevenLabsClient | null = null;
  private apiKey: string | null = null;
  private voiceId: string | null = null;
  private model: string = 'eleven_multilingual_v2';

  initialize(config: ElevenLabsConfig): void {
    try {
      this.apiKey = config.apiKey;
      this.voiceId = config.voiceId;
      this.model = config.model || 'eleven_multilingual_v2';

      if (!this.apiKey || this.apiKey === 'YOUR_ELEVENLABS_API_KEY') {
        throw new Error('ElevenLabs API key not configured');
      }

      this.client = new ElevenLabsClient({
        apiKey: this.apiKey
      });

      console.log('ElevenLabs TTS Service initialized successfully');
    } catch (error) {
      console.error('Error initializing ElevenLabs TTS Service:', error);
      throw error;
    }
  }

  async synthesizeSpeechWithVisemes(text: string): Promise<TTSResult> {
    if (!this.client || !this.voiceId) {
      throw new Error('ElevenLabs service not initialized');
    }

    try {
      const preparedText = this.prepareSpeechInput(text);
      console.log('Generating speech with ElevenLabs...');

      // Generate audio using ElevenLabs
      const audioStream = await this.client.textToSpeech.convert(this.voiceId, {
        text: preparedText,
        model_id: this.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      });

      // Convert stream to ArrayBuffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      // Combine all chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      const audioBuffer = audioData.buffer;

      // ElevenLabs doesn't provide viseme data by default
      // Generate approximate visemes based on text length and estimated duration
      const duration = await this.getAudioDuration(audioBuffer, preparedText.length);
      const visemeData = this.generateApproximateVisemes(preparedText, duration);

      console.log(`ElevenLabs speech synthesis completed. Duration: ${duration}ms`);

      return {
        audioBuffer,
        visemeData,
        duration
      };
    } catch (error) {
      console.error('ElevenLabs speech synthesis error:', error);
      throw new Error(`Failed to synthesize speech with ElevenLabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async synthesizeSpeechOnly(text: string): Promise<{ audioBuffer: ArrayBuffer; duration: number }> {
    if (!this.client || !this.voiceId) {
      throw new Error('ElevenLabs service not initialized');
    }

    try {
      const preparedText = this.prepareSpeechInput(text);
      console.log('Generating speech with ElevenLabs (no visemes)...');

      const audioStream = await this.client.textToSpeech.convert(this.voiceId, {
        text: preparedText,
        model_id: this.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      });

      // Convert stream to ArrayBuffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      const duration = await this.getAudioDuration(audioData.buffer, preparedText.length);
      console.log('ElevenLabs speech synthesis completed');
      return {
        audioBuffer: audioData.buffer,
        duration
      };
    } catch (error) {
      console.error('ElevenLabs speech synthesis error:', error);
      throw new Error(`Failed to synthesize speech with ElevenLabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private prepareSpeechInput(text: string): string {
    // Truncate text by removing portion starting with '*Source:*'
    const sourceIndex = text.indexOf('**Source:**');
    if (sourceIndex !== -1) {
      text = text.substring(0, sourceIndex).trim();
      text = text + ' Please check references below for more information';
    }
    return text.trim();
  }

  private async getAudioDuration(audioBuffer: ArrayBuffer, textLength: number): Promise<number> {
    try {
      // Try to get exact duration using Web Audio API
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const decodedBuffer = await audioContext.decodeAudioData(audioBuffer.slice(0));
        await audioContext.close();
        return decodedBuffer.duration * 1000;
      }
    } catch (error) {
      console.warn('Failed to decode audio data for duration, falling back to estimation:', error);
    }

    // Fallback to estimation (updated to be slightly faster/shorter to avoid typing lag)
    // Previous: 12.5 chars/sec
    // New: 15 chars/sec (faster rate -> shorter duration -> typing finishes faster)
    // It's better for typing to finish slightly early than late.
    const estimatedSeconds = textLength / 15;
    return Math.round(estimatedSeconds * 1000);
  }

  // estimateAudioDuration is replaced by getAudioDuration


  private generateApproximateVisemes(text: string, duration: number): VisemeData[] {
    // Generate viseme data based on time intervals for smoother animation
    // behaving closer to real lip-sync data
    const visemes: VisemeData[] = [];
    const interval = 50; // New viseme every 50ms for fluid motion

    // Map of common viseme IDs for variety
    // 0: silence, 1-21: various mouth shapes
    const activeVisemes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

    let currentTime = 0;
    let lastVisemeId = 0;

    while (currentTime < duration) {
      // 10% chance of a short pause (mouth closed) to simulate rhythm, but mostly keep moving
      const isPause = Math.random() < 0.1;

      let visemeId: number;

      if (isPause) {
        visemeId = 0;
      } else {
        // Pick a random active viseme, try to be different from last one for movement
        do {
          const index = Math.floor(Math.random() * activeVisemes.length);
          visemeId = activeVisemes[index];
        } while (visemeId === lastVisemeId && Math.random() > 0.3); // 30% chance to allow repeat
      }

      visemes.push({
        audioOffset: currentTime,
        visemeId: visemeId
      });

      lastVisemeId = visemeId;
      currentTime += interval;
    }

    // Ensure final state is closed
    visemes.push({
      audioOffset: duration,
      visemeId: 0
    });

    return visemes;
  }

  // Helper method removed as it is no longer used by the new time-based approach
  // private getApproximateVisemeId(word: string): number { ... }

  dispose(): void {
    this.client = null;
    this.apiKey = null;
    this.voiceId = null;
    console.log('ElevenLabs TTS Service disposed');
  }
}

// Singleton instance
export const elevenLabsTTSService = new ElevenLabsTTSService();
