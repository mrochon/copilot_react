// Type declarations for @elevenlabs/elevenlabs-js
declare module '@elevenlabs/elevenlabs-js' {
  export interface VoiceSettings {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  }

  export interface TextToSpeechOptions {
    text: string;
    model_id?: string;
    voice_settings?: VoiceSettings;
  }

  export interface ElevenLabsClientOptions {
    apiKey: string;
  }

  export class ElevenLabsClient {
    constructor(options: ElevenLabsClientOptions);
    
    textToSpeech: {
      convert(voiceId: string, options: TextToSpeechOptions): AsyncIterable<Uint8Array>;
    };
  }
}
