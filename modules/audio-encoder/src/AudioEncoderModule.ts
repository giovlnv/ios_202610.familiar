import { NativeModule, requireNativeModule } from 'expo';

declare class AudioEncoderModule extends NativeModule<{}> {
  toM4a(input: string, output: string, bitrate: number): Promise<void>;
  systemVoices(language: string): { id: string; name: string; language: string }[];
  speakToWav(text: string, language: string, voice: string | null, output: string): Promise<string>;
}

export default requireNativeModule<AudioEncoderModule>('AudioEncoder');
