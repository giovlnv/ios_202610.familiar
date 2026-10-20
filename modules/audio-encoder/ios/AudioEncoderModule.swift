import AVFoundation
import ExpoModulesCore

public class AudioEncoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioEncoder")

    AsyncFunction("toM4a") { (input: URL, output: URL, bitrate: Int) in
      let src = try AVAudioFile(forReading: input)
      let fmt = src.processingFormat
      let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: fmt.sampleRate,
        AVNumberOfChannelsKey: fmt.channelCount,
        AVEncoderBitRateKey: bitrate,
      ]
      if FileManager.default.fileExists(atPath: output.path) {
        try FileManager.default.removeItem(at: output)
      }
      let dst = try AVAudioFile(forWriting: output, settings: settings, commonFormat: fmt.commonFormat, interleaved: fmt.isInterleaved)
      guard let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: 32768) else { return }
      while src.framePosition < src.length {
        try src.read(into: buf)
        if buf.frameLength == 0 { break }
        try dst.write(from: buf)
      }
    }
  }
}
