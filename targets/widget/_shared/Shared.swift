import AppIntents
import Foundation

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

let appGroup: String = {
  let groups = provisionedAppGroups()
  return groups.first { $0.contains("tarotreader") } ?? groups.first ?? "group.com.giovlnv.tarotreader"
}()

struct DayData: Codable {
  let date: String
  let card: String
  let cardName: String
  let moon: String
  let lit: Int
  let waxing: Bool
  let moonSign: String
  let day: Int?
}

struct ListeningData: Codable {
  let title: String
  let section: String
  let progress: Double
  let folder: String?
}

struct ColorData: Codable {
  let bg: String
  let text: String
  let accent: String
}

struct WidgetData: Codable {
  let days: [DayData]
  let listening: ListeningData?
  let colors: ColorData
}

enum Shared {
  static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  static func data() -> WidgetData? {
    guard let s = defaults?.string(forKey: "data"), let d = s.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetData.self, from: d)
  }

  static func today(_ date: Date = Date()) -> DayData? {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    let key = f.string(from: date)
    return data()?.days.first { $0.date == key } ?? data()?.days.first
  }

  static func ask(_ action: String) {
    defaults?.set(action, forKey: "action")
  }
}

struct ContinueBookIntent: AppIntent {
  static let title: LocalizedStringResource = "Continue my book"
  static let description = IntentDescription("Opens Familiar and keeps listening where you stopped.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    Shared.ask("continue")
    return .result()
  }
}

struct CardOfTheDayIntent: AppIntent {
  static let title: LocalizedStringResource = "Card of the day"
  static let description = IntentDescription("Tells you today's card in Familiar.")

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    guard let d = Shared.today() else {
      return .result(dialog: "Open Familiar once so your familiar can find today's card.")
    }
    return .result(dialog: "Your card of the day is \(d.cardName).")
  }
}

struct LogReadingIntent: AppIntent {
  static let title: LocalizedStringResource = "Log a reading"
  static let description = IntentDescription("Opens a new reading in your Familiar journal.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    Shared.ask("log")
    return .result()
  }
}

struct SleepTimerIntent: AppIntent {
  static let title: LocalizedStringResource = "Set a sleep timer"
  static let description = IntentDescription("Keeps listening in Familiar and stops after some minutes.")
  static let openAppWhenRun: Bool = true

  @Parameter(title: "Minutes", default: 30)
  var minutes: Int

  @MainActor
  func perform() async throws -> some IntentResult {
    Shared.ask("sleep:\(minutes)")
    return .result()
  }
}

struct FamiliarShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: ContinueBookIntent(), phrases: ["Continue my book in \(.applicationName)"], shortTitle: "Continue my book", systemImageName: "headphones")
    AppShortcut(intent: CardOfTheDayIntent(), phrases: ["What's my card of the day in \(.applicationName)"], shortTitle: "Card of the day", systemImageName: "sparkles")
    AppShortcut(intent: LogReadingIntent(), phrases: ["Log a reading in \(.applicationName)"], shortTitle: "Log a reading", systemImageName: "square.and.pencil")
    AppShortcut(intent: SleepTimerIntent(), phrases: ["Set a sleep timer in \(.applicationName)"], shortTitle: "Sleep timer", systemImageName: "moon.zzz")
  }
}
