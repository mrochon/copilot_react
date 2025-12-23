/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPEECH_KEY?: string;
  readonly VITE_SPEECH_REGION?: string;
  readonly VITE_SPEECH_VOICE?: string;
  readonly VITE_SPEECH_RECOGNITION_LANGUAGE?: string;
  readonly VITE_AVATAR_IMAGE_URL?: string;
  readonly VITE_AVATAR_MOUTH_TOP?: string;
  readonly VITE_AVATAR_MOUTH_LEFT?: string;
  readonly VITE_AVATAR_MOUTH_WIDTH?: string;
  readonly VITE_AVATAR_MOUTH_HEIGHT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
