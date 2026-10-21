import AVFoundation
import ExpoModulesCore
import PDFKit

func provisionedAppGroups() -> [String] {
  guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
        let data = try? Data(contentsOf: url),
        let start = data.range(of: Data("<?xml".utf8)),
        let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex),
        let plist = try? PropertyListSerialization.propertyList(from: data.subdata(in: start.lowerBound..<end.upperBound), format: nil) as? [String: Any],
        let ents = plist["Entitlements"] as? [String: Any]
  else { return [] }
  return ents["com.apple.security.application-groups"] as? [String] ?? []
}

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

    Function("pdfPages") { (input: URL) -> [String] in
      guard let doc = PDFDocument(url: input) else { return [] }
      return (0..<doc.pageCount).map { doc.page(at: $0)?.string ?? "" }
    }

    Function("pdfOutline") { (input: URL) -> [[String: Any]] in
      guard let doc = PDFDocument(url: input), let root = doc.outlineRoot else { return [] }
      var out: [[String: Any]] = []
      func walk(_ node: PDFOutline, _ depth: Int) {
        for i in 0..<node.numberOfChildren {
          guard let child = node.child(at: i) else { continue }
          if let page = child.destination?.page {
            out.append(["title": child.label ?? "", "page": doc.index(for: page), "depth": depth])
          }
          if depth < 1 { walk(child, depth + 1) }
        }
      }
      walk(root, 0)
      return out
    }

    AsyncFunction("audioChapters") { (input: URL) -> [[String: Any]] in
      let asset = AVURLAsset(url: input)
      let locales = try await asset.load(.availableChapterLocales)
      let groups = try await asset.loadChapterMetadataGroups(withTitleLocale: locales.first ?? Locale.current, containingItemsWithCommonKeys: [.commonKeyTitle])
      var out: [[String: Any]] = []
      for (i, g) in groups.enumerated() {
        let title = try? await g.items.first(where: { $0.commonKey == .commonKeyTitle })?.load(.stringValue)
        out.append(["title": title ?? "Chapter \(i + 1)", "start": g.timeRange.start.seconds, "duration": g.timeRange.duration.seconds])
      }
      return out
    }

    AsyncFunction("cutAudio") { (input: URL, output: URL, start: Double, duration: Double, promise: Promise) in
      let asset = AVURLAsset(url: input)
      if FileManager.default.fileExists(atPath: output.path) {
        try? FileManager.default.removeItem(at: output)
      }
      guard let export = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough) else {
        promise.reject("ERR_CUT", "Cannot export this audio")
        return
      }
      export.outputURL = output
      export.outputFileType = .m4a
      export.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), duration: CMTime(seconds: duration, preferredTimescale: 600))
      export.exportAsynchronously {
        if export.status == .completed { promise.resolve(nil) }
        else { promise.reject("ERR_CUT", export.error?.localizedDescription ?? "Export failed") }
      }
    }

    Function("appGroups") { () -> [String] in
      provisionedAppGroups()
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
