import { NativeModule, requireNativeModule } from 'expo';

declare class AudioEncoderModule extends NativeModule<{}> {
  toM4a(input: string, output: string, bitrate: number): Promise<void>;
}

export default requireNativeModule<AudioEncoderModule>('AudioEncoder');
