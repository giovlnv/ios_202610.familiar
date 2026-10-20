import AVFoundation
import ExpoModulesCore

public class AudioEncoderModule: Module {
  private let speech = AVSpeechSynthesizer()

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

    Function("systemVoices") { (language: String) -> [[String: String]] in
      AVSpeechSynthesisVoice.speechVoices()
        .filter { $0.language.hasPrefix(language) }
        .map { ["id": $0.identifier, "name": $0.name, "language": $0.language] }
    }

    AsyncFunction("speakToWav") { (text: String, language: String, voice: String?, output: URL, promise: Promise) in
      let utterance = AVSpeechUtterance(string: text)
      utterance.voice = voice.flatMap { AVSpeechSynthesisVoice(identifier: $0) } ?? AVSpeechSynthesisVoice(language: language)
      if FileManager.default.fileExists(atPath: output.path) {
        try? FileManager.default.removeItem(at: output)
      }
      var file: AVAudioFile?
      var done = false
      self.speech.write(utterance) { buffer in
        guard !done else { return }
        guard let pcm = buffer as? AVAudioPCMBuffer, pcm.frameLength > 0 else {
          done = true
          file = nil
          promise.resolve(output.absoluteString)
          return
        }
        do {
          if file == nil {
            let settings: [String: Any] = [
              AVFormatIDKey: kAudioFormatLinearPCM,
              AVSampleRateKey: pcm.format.sampleRate,
              AVNumberOfChannelsKey: 1,
              AVLinearPCMBitDepthKey: 16,
              AVLinearPCMIsFloatKey: false,
            ]
            file = try AVAudioFile(forWriting: output, settings: settings, commonFormat: pcm.format.commonFormat, interleaved: pcm.format.isInterleaved)
          }
          try file?.write(from: pcm)
        } catch {
          done = true
          promise.reject("ERR_SPEAK", error.localizedDescription)
        }
      }
    }
  }
}
