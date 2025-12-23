// Base interface for Text-to-Speech services
export interface VisemeData {
  audioOffset: number;
  visemeId: number;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  visemeData: VisemeData[];
  duration: number;
}

export interface TTSService {
  initialize(config: any): void;
  synthesizeSpeechWithVisemes(text: string): Promise<TTSResult>;
  synthesizeSpeechOnly(text: string): Promise<{ audioBuffer: ArrayBuffer; duration: number }>;
  dispose(): void;
}
