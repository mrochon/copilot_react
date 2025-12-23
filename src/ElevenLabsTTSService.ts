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
      const estimatedDuration = this.estimateAudioDuration(preparedText);
      const visemeData = this.generateApproximateVisemes(preparedText, estimatedDuration);

      console.log(`ElevenLabs speech synthesis completed. Estimated Duration: ${estimatedDuration}ms`);

      return {
        audioBuffer,
        visemeData,
        duration: estimatedDuration
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

      const duration = this.estimateAudioDuration(preparedText);
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
    const sourceIndex = text.indexOf('**Source:*');
    if (sourceIndex !== -1) {
      text = text.substring(0, sourceIndex).trim();
      text = text + ' Please check references below for more information';
    }
    return text.trim();
  }

  private estimateAudioDuration(text: string): number {
    // Rough estimation: ~150 words per minute = ~2.5 words per second
    // Average word length ~5 characters, so ~12.5 characters per second
    const charCount = text.length;
    const estimatedSeconds = charCount / 12.5;
    return Math.round(estimatedSeconds * 1000); // Convert to milliseconds
  }

  private generateApproximateVisemes(text: string, duration: number): VisemeData[] {
    // Generate simple viseme data based on text
    // This is an approximation since ElevenLabs doesn't provide real viseme data
    const visemes: VisemeData[] = [];
    const words = text.split(/\s+/);
    const timePerWord = duration / words.length;

    let currentTime = 0;
    words.forEach((word) => {
      // Add visemes for mouth open/close pattern
      const visemeId = this.getApproximateVisemeId(word);
      
      visemes.push({
        audioOffset: currentTime,
        visemeId: visemeId
      });

      // Add mid-word viseme
      visemes.push({
        audioOffset: currentTime + timePerWord / 2,
        visemeId: (visemeId + 1) % 21 // Cycle through viseme IDs
      });

      currentTime += timePerWord;
    });

    // Add final closing viseme
    visemes.push({
      audioOffset: duration,
      visemeId: 0 // Mouth closed
    });

    return visemes;
  }

  private getApproximateVisemeId(word: string): number {
    // Map common phonetic patterns to viseme IDs (0-20)
    // This is a simplified approximation
    const firstChar = word.toLowerCase().charAt(0);
    
    // Consonant mapping
    const visemeMap: { [key: string]: number } = {
      'a': 2, 'e': 4, 'i': 6, 'o': 8, 'u': 10,
      'b': 21, 'p': 21, 'm': 21,
      'f': 18, 'v': 18,
      'd': 19, 't': 19, 'n': 19, 'l': 19,
      's': 15, 'z': 15,
      'r': 13,
      'w': 7, 'q': 7,
      'th': 16
    };

    return visemeMap[firstChar] || 1;
  }

  dispose(): void {
    this.client = null;
    this.apiKey = null;
    this.voiceId = null;
    console.log('ElevenLabs TTS Service disposed');
  }
}

// Singleton instance
export const elevenLabsTTSService = new ElevenLabsTTSService();
