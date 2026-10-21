import { NativeModule, requireNativeModule } from 'expo';

declare class AudioEncoderModule extends NativeModule<{}> {
  toM4a(input: string, output: string, bitrate: number): Promise<void>;
  appGroups(): string[];
  systemVoices(language: string): { id: string; name: string; language: string }[];
  pdfPages(input: string): string[];
  pdfOutline(input: string): { title: string; page: number; depth: number }[];
  audioChapters(input: string): Promise<{ title: string; start: number; duration: number }[]>;
  cutAudio(input: string, output: string, start: number, duration: number): Promise<void>;
  speakToWav(text: string, language: string, voice: string | null, output: string): Promise<string>;
}

export default requireNativeModule<AudioEncoderModule>('AudioEncoder');
