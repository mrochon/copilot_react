import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { TTSService, TTSResult } from './TTSService';
import type { VisemeData } from './TTSService';

export interface SpeechConfig {
  subscriptionKey?: string;
  authorizationToken?: string;
  getAuthorizationToken?: () => Promise<string>;
  region: string;
  voiceName: string;
}

export type { VisemeData };

class SilentPushAudioOutputStreamCallback extends SpeechSDK.PushAudioOutputStreamCallback {
  write(): void {
    // Intentionally discard synthesized audio chunks to keep playback under our control.
  }

  close(): void {
    // Nothing to release for the silent stream.
  }
}

export class AzureSpeechService implements TTSService {
  private speechConfig: SpeechSDK.SpeechConfig | null = null;
  private synthesizer: SpeechSDK.SpeechSynthesizer | null = null;
  private subscriptionKey: string | null = null;
  private authorizationToken: string | null = null;
  private getAuthorizationToken: (() => Promise<string>) | null = null;
  private tokenExpiresAt: number | null = null;
  private region: string | null = null;
  private silentAudioStream: SpeechSDK.PushAudioOutputStream | null = null;
  private silentAudioCallback: SpeechSDK.PushAudioOutputStreamCallback | null = null;
  private activeSynthesisPromises: Set<{ settled: boolean }> = new Set();
  private readonly synthesisTimeoutMs = 20000;

  async initialize(config: SpeechConfig): Promise<void> {
    try {
      this.region = config.region;
      this.subscriptionKey = config.subscriptionKey || null;
      this.authorizationToken = config.authorizationToken || null;
      this.getAuthorizationToken = config.getAuthorizationToken || null;

      if (!this.region) {
        throw new Error('Speech service region is required');
      }

      if (this.subscriptionKey) {
        this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
      } else {
        const token = await this.resolveAuthorizationToken();
        if (!token) {
          throw new Error('Speech service authorization token is required');
        }
        
        // For OAuth2, use the custom subdomain endpoint (no trailing slash)
        const endpoint = `https://${this.region}.cognitiveservices.azure.com`;
        this.speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, this.region);
        
        // Override the endpoint to ensure the SDK uses the correct custom subdomain
        this.speechConfig.setProperty(
          SpeechSDK.PropertyId.SpeechServiceConnection_Endpoint,
          endpoint
        );
        
        console.log(`Azure Speech Service using OAuth2 with subdomain: ${this.region}, endpoint: ${endpoint}`);
      }

      this.speechConfig.speechSynthesisVoiceName = config.voiceName;
      
      // Configure for high quality audio
      this.speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

      this.createSynthesizer();
      
      console.log('Azure Speech Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Azure Speech Service:', error);
      throw error;
    }
  }

  async synthesizeSpeechWithVisemes(text: string): Promise<TTSResult> {
    if (!this.synthesizer) {
      throw new Error('Speech service not initialized');
    }

    await this.ensureAuthorizationToken();
    
    console.log(`Starting speech synthesis for text: "${text.substring(0, 50)}..."`);
    console.log(`Using speech config with region: ${this.region}`);

    return new Promise((resolve, reject) => {
      const visemeData: VisemeData[] = [];
      let audioBuffer: ArrayBuffer;
      let duration = 0;
      const promiseState = { settled: false };
      this.activeSynthesisPromises.add(promiseState);
      const timeoutHandle = window.setTimeout(() => {
        if (promiseState.settled || !this.activeSynthesisPromises.has(promiseState)) return;
        promiseState.settled = true;
        this.activeSynthesisPromises.delete(promiseState);
        console.error('Speech synthesis timed out');
        this.resetSynthesizerAfterFailure();
        reject(new Error('Speech synthesis timed out'));
      }, this.synthesisTimeoutMs);

      // Create SSML with viseme requests
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
               xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
          <voice name="${this.speechConfig!.speechSynthesisVoiceName}">
            <mstts:viseme type="FacialExpression"/>
            ${this.prepareSpeechInput(text)}
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
          if (promiseState.settled || !this.activeSynthesisPromises.has(promiseState)) return;
          promiseState.settled = true;
          this.activeSynthesisPromises.delete(promiseState);
          window.clearTimeout(timeoutHandle);
          
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
            const errorMsg = `Speech synthesis failed: ${result.reason}. ${result.errorDetails || 'No additional details'}`;
            console.error(errorMsg);
            console.error('Full result:', result);
            reject(new Error(errorMsg));
          }
        },
        (error) => {
          if (promiseState.settled || !this.activeSynthesisPromises.has(promiseState)) return;
          promiseState.settled = true;
          this.activeSynthesisPromises.delete(promiseState);
          window.clearTimeout(timeoutHandle);
          
          console.error('Speech synthesis error:', error);
          this.resetSynthesizerAfterFailure();
          reject(error);
        }
      );
    });
  }

  async createSpeechRecognizer(options?: { language?: string }): Promise<SpeechSDK.SpeechRecognizer> {
    if (!this.region) {
      throw new Error('Speech service not initialized');
    }

    if (!this.subscriptionKey && !this.authorizationToken && !this.getAuthorizationToken) {
      throw new Error('Speech service not initialized');
    }

    if (!this.subscriptionKey) {
      await this.ensureAuthorizationToken();
    }

    const speechConfig = this.subscriptionKey
      ? SpeechSDK.SpeechConfig.fromSubscription(this.subscriptionKey, this.region)
      : SpeechSDK.SpeechConfig.fromAuthorizationToken(this.authorizationToken || '', this.region);

    if (!this.subscriptionKey && !this.authorizationToken) {
      throw new Error('Speech service authorization token is required');
    }

    if (options?.language) {
      speechConfig.speechRecognitionLanguage = options.language;
    }

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    return new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
  }

  async synthesizeSpeechOnly(text: string): Promise<{ audioBuffer: ArrayBuffer; duration: number }> {
    if (!this.synthesizer) {
      throw new Error('Speech service not initialized');
    }

    await this.ensureAuthorizationToken();

    return new Promise((resolve, reject) => {
      const promiseState = { settled: false };
      this.activeSynthesisPromises.add(promiseState);
      const timeoutHandle = window.setTimeout(() => {
        if (promiseState.settled || !this.activeSynthesisPromises.has(promiseState)) return;
        promiseState.settled = true;
        this.activeSynthesisPromises.delete(promiseState);
        console.error('Speech synthesis timed out');
        this.resetSynthesizerAfterFailure();
        reject(new Error('Speech synthesis timed out'));
      }, this.synthesisTimeoutMs);
      
      this.synthesizer!.speakTextAsync(
        text,
        (result) => {
          if (promiseState.settled || !this.activeSynthesisPromises.has(promiseState)) return;
          promiseState.settled = true;
          this.activeSynthesisPromises.delete(promiseState);
          window.clearTimeout(timeoutHandle);
          
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            const duration = result.audioDuration / 10000; // Convert to milliseconds
            console.log(`Speech synthesis completed. Duration: ${duration}ms`);
            resolve({
              audioBuffer: result.audioData,
              duration
            });
          } else {
            const errorMsg = `Speech synthesis failed: ${result.reason}. ${result.errorDetails || 'No additional details'}`;
            console.error(errorMsg);
            console.error('Full result:', result);
            reject(new Error(errorMsg));
          }
        },
        (error) => {
          if (promiseState.settled || !this.activeSynthesisPromises.has(promiseState)) return;
          promiseState.settled = true;
          this.activeSynthesisPromises.delete(promiseState);
          window.clearTimeout(timeoutHandle);
          
          console.error('Speech synthesis error:', error);
          this.resetSynthesizerAfterFailure();
          reject(error);
        }
      );
    });
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

  dispose(): void {
    // Mark all active promises as settled to prevent callbacks
    this.activeSynthesisPromises.forEach(state => {
      state.settled = true;
    });
    this.activeSynthesisPromises.clear();
    
    if (this.synthesizer) {
      this.synthesizer.close();
      this.synthesizer = null;
    }
    this.speechConfig = null;
    this.subscriptionKey = null;
    this.authorizationToken = null;
    this.getAuthorizationToken = null;
    this.tokenExpiresAt = null;
    this.region = null;
    if (this.silentAudioStream) {
      this.silentAudioStream.close();
      this.silentAudioStream = null;
    }
    this.silentAudioCallback = null;
  }

  private createSynthesizer(): void {
    if (!this.speechConfig) {
      throw new Error('Speech config not initialized');
    }

    if (this.silentAudioStream) {
      this.silentAudioStream.close();
    }

    this.silentAudioCallback = new SilentPushAudioOutputStreamCallback();
    const silentStream = SpeechSDK.PushAudioOutputStream.create(this.silentAudioCallback);
    this.silentAudioStream = silentStream;
    const audioConfig = SpeechSDK.AudioConfig.fromStreamOutput(silentStream);

    // Create synthesizer with a silent audio destination so we control playback
    if (this.synthesizer) {
      this.synthesizer.close();
    }
    this.synthesizer = new SpeechSDK.SpeechSynthesizer(this.speechConfig, audioConfig);
  }

  private resetSynthesizerAfterFailure(): void {
    try {
      this.createSynthesizer();
    } catch (error) {
      console.warn('Unable to reset speech synthesizer after failure:', error);
    }
  }

  private async ensureAuthorizationToken(): Promise<void> {
    if (this.subscriptionKey || !this.speechConfig) {
      return;
    }

    // Check if token needs refresh
    const needsRefresh = !this.authorizationToken || this.isTokenExpiringSoon();
    
    if (needsRefresh) {
      const token = await this.resolveAuthorizationToken();
      if (!token) {
        throw new Error('Speech service authorization token is required');
      }

      // Update the speech config with the new token
      this.speechConfig.authorizationToken = token;
      
      console.log('Azure Speech authorization token refreshed');
    }
  }

  private async resolveAuthorizationToken(): Promise<string | null> {
    if (this.getAuthorizationToken) {
      const shouldRefresh = !this.authorizationToken || this.isTokenExpiringSoon();
      if (shouldRefresh) {
        const freshToken = await this.getAuthorizationToken();
        if (freshToken) {
          this.authorizationToken = freshToken;
          this.tokenExpiresAt = this.getTokenExpiry(freshToken);
        }
      }
    }

    if (!this.authorizationToken) {
      return null;
    }

    return this.authorizationToken;
  }

  private isTokenExpiringSoon(): boolean {
    if (!this.tokenExpiresAt) {
      return true;
    }

    const now = Date.now();
    const refreshWindowMs = 2 * 60 * 1000;
    return this.tokenExpiresAt - now <= refreshWindowMs;
  }

  private getTokenExpiry(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const parsed = JSON.parse(decoded);
      
      // Log token details for debugging (without exposing sensitive data)
      console.log('Token details:', {
        audience: parsed.aud,
        scopes: parsed.scp,
        expiry: parsed.exp ? new Date(parsed.exp * 1000).toISOString() : 'unknown'
      });
      
      if (!parsed.exp) return null;
      return parsed.exp * 1000;
    } catch (error) {
      console.warn('Unable to parse token expiry:', error);
      return null;
    }
  }
}

// Singleton instance
export const azureSpeechService = new AzureSpeechService();