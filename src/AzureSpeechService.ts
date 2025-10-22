import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export interface SpeechConfig {
  subscriptionKey: string;
  region: string;
  voiceName: string;
}

export interface VisemeData {
  audioOffset: number;
  visemeId: number;
}

export class AzureSpeechService {
  private speechConfig: SpeechSDK.SpeechConfig | null = null;
  private synthesizer: SpeechSDK.SpeechSynthesizer | null = null;
  private subscriptionKey: string | null = null;
  private region: string | null = null;

  initialize(config: SpeechConfig): void {
    try {
      this.subscriptionKey = config.subscriptionKey;
      this.region = config.region;
      this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(config.subscriptionKey, config.region);
      this.speechConfig.speechSynthesisVoiceName = config.voiceName;
      
      // Configure for high quality audio
      this.speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;
      
      // Create synthesizer with no audio output (we'll handle audio ourselves)
      this.synthesizer = new SpeechSDK.SpeechSynthesizer(this.speechConfig, undefined);
      
      console.log('Azure Speech Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Azure Speech Service:', error);
      throw error;
    }
  }

  async synthesizeSpeechWithVisemes(text: string): Promise<{
    audioBuffer: ArrayBuffer;
    visemeData: VisemeData[];
    duration: number;
  }> {
    if (!this.synthesizer) {
      throw new Error('Speech service not initialized');
    }

    return new Promise((resolve, reject) => {
      const visemeData: VisemeData[] = [];
      let audioBuffer: ArrayBuffer;
      let duration = 0;

      // Create SSML with viseme requests
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
               xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
          <voice name="${this.speechConfig!.speechSynthesisVoiceName}">
            <mstts:viseme type="FacialExpression"/>
            ${this.escapeXml(text)}
          </voice>
        </speak>
      `;

      // Handle viseme events for lip-sync
      this.synthesizer!.visemeReceived = (sender, event) => {
        visemeData.push({
          audioOffset: event.audioOffset / 10000, // Convert to milliseconds
          visemeId: event.visemeId
        });
      };

      // Handle synthesis completion
      this.synthesizer!.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            audioBuffer = result.audioData;
            duration = result.audioDuration / 10000; // Convert to milliseconds
            
            console.log(`Speech synthesis completed. Duration: ${duration}ms, Visemes: ${visemeData.length}`);
            
            resolve({
              audioBuffer,
              visemeData: visemeData.sort((a, b) => a.audioOffset - b.audioOffset),
              duration
            });
          } else {
            console.error('Speech synthesis failed:', result.errorDetails);
            reject(new Error(result.errorDetails));
          }
        },
        (error) => {
          console.error('Speech synthesis error:', error);
          reject(error);
        }
      );
    });
  }

  createSpeechRecognizer(options?: { language?: string }): SpeechSDK.SpeechRecognizer {
    if (!this.subscriptionKey || !this.region) {
      throw new Error('Speech service not initialized');
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
    if (options?.language) {
      speechConfig.speechRecognitionLanguage = options.language;
    }

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    return new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
  }

  async synthesizeSpeechOnly(text: string): Promise<ArrayBuffer> {
    if (!this.synthesizer) {
      throw new Error('Speech service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.synthesizer!.speakTextAsync(
        text,
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log('Speech synthesis completed');
            resolve(result.audioData);
          } else {
            console.error('Speech synthesis failed:', result.errorDetails);
            reject(new Error(result.errorDetails));
          }
        },
        (error) => {
          console.error('Speech synthesis error:', error);
          reject(error);
        }
      );
    });
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  dispose(): void {
    if (this.synthesizer) {
      this.synthesizer.close();
      this.synthesizer = null;
    }
    this.speechConfig = null;
    this.subscriptionKey = null;
    this.region = null;
  }
}

// Singleton instance
export const azureSpeechService = new AzureSpeechService();