import AppIntents
import SwiftUI
import WidgetKit

struct ShowIntent: WidgetConfigurationIntent {
  static let title: LocalizedStringResource = "Familiar"
  static let description = IntentDescription("Choose what the widget shows.")

  @Parameter(title: "Card of the day", default: true) var card: Bool
  @Parameter(title: "Moon phase and sign", default: true) var moon: Bool
  @Parameter(title: "Personal day", default: true) var day: Bool
  @Parameter(title: "Continue listening", default: true) var listening: Bool
  @Parameter(title: "Your familiar", default: true) var familiar: Bool
}

struct Entry: TimelineEntry {
  let date: Date
  let show: ShowIntent
  let day: DayData?
  let data: WidgetData?
}

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> Entry {
    Entry(date: Date(), show: ShowIntent(), day: nil, data: nil)
  }

  func snapshot(for configuration: ShowIntent, in context: Context) async -> Entry {
    Entry(date: Date(), show: configuration, day: Shared.today(), data: Shared.data())
  }

  func timeline(for configuration: ShowIntent, in context: Context) async -> Timeline<Entry> {
    let cal = Calendar.current
    let data = Shared.data()
    var entries: [Entry] = []
    for i in 0..<7 {
      let start = i == 0 ? Date() : cal.startOfDay(for: cal.date(byAdding: .day, value: i, to: Date())!)
      entries.append(Entry(date: start, show: configuration, day: Shared.today(start), data: data))
    }
    return Timeline(entries: entries, policy: .atEnd)
  }
}

extension Color {
  init(hex: String) {
    var v: UInt64 = 0
    Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
  }
}

func storedImage(_ key: String) -> UIImage? {
  guard let s = Shared.defaults?.string(forKey: key), let d = Data(base64Encoded: s) else { return nil }
  return UIImage(data: d)
}

struct MoonView: View {
  let lit: Int
  let waxing: Bool
  let color: Color
  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      ZStack {
        Circle().fill(color.opacity(0.18))
        Circle().fill(color)
          .mask(
            Rectangle()
              .frame(width: w * CGFloat(lit) / 100)
              .frame(maxWidth: .infinity, alignment: waxing ? .trailing : .leading)
          )
      }
    }
    .aspectRatio(1, contentMode: .fit)
  }
}

struct FamiliarWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: Entry

  var text: Color { Color(hex: entry.data?.colors.text ?? "#ECE6F5") }
  var accent: Color { Color(hex: entry.data?.colors.accent ?? "#D9B45B") }

  var items: [String] {
    var list: [String] = []
    if entry.show.familiar { list.append("familiar") }
    if entry.show.card { list.append("card") }
    if entry.show.moon { list.append("moon") }
    if entry.show.day, entry.day?.day != nil { list.append("day") }
    if entry.show.listening, entry.data?.listening != nil { list.append("listening") }
    return list
  }

  @ViewBuilder func card(_ big: Bool) -> some View {
    if let d = entry.day {
      VStack(spacing: 4) {
        if let img = storedImage("card-\(d.card)") {
          Image(uiImage: img).resizable().aspectRatio(contentMode: .fit).clipShape(RoundedRectangle(cornerRadius: 6))
        }
        Text(d.cardName).font(.system(size: big ? 14 : 12, weight: .semibold)).foregroundColor(text).lineLimit(1).minimumScaleFactor(0.7)
      }
    }
  }

  @ViewBuilder var moon: some View {
    if let d = entry.day {
      HStack(spacing: 6) {
        MoonView(lit: d.lit, waxing: d.waxing, color: accent).frame(width: 22, height: 22)
        VStack(alignment: .leading, spacing: 0) {
          Text(d.moon).font(.system(size: 12, weight: .semibold)).foregroundColor(text)
          Text("Moon in \(d.moonSign)").font(.system(size: 11)).foregroundColor(text.opacity(0.7))
        }
      }
    }
  }

  @ViewBuilder var day: some View {
    if let n = entry.day?.day {
      HStack(spacing: 6) {
        Text("\(n)").font(.system(size: 20, weight: .bold, design: .serif)).foregroundColor(accent)
        Text("Personal day").font(.system(size: 12)).foregroundColor(text.opacity(0.8))
      }
    }
  }

  @ViewBuilder var listening: some View {
    if let l = entry.data?.listening {
      Link(destination: URL(string: l.folder.map { "tarotreader://player/\($0)" } ?? "tarotreader://")!) {
        VStack(alignment: .leading, spacing: 3) {
          Text(l.title).font(.system(size: 12, weight: .semibold)).foregroundColor(text).lineLimit(1)
          Text(l.section).font(.system(size: 11)).foregroundColor(text.opacity(0.7)).lineLimit(1)
          ProgressView(value: l.progress).tint(accent)
        }
      }
    }
  }

  @ViewBuilder var familiar: some View {
    if let img = storedImage("familiar") {
      Image(uiImage: img).resizable().aspectRatio(contentMode: .fit)
    }
  }

  @ViewBuilder func item(_ id: String, big: Bool = false) -> some View {
    switch id {
    case "familiar": familiar
    case "card": card(big)
    case "moon": moon
    case "day": day
    default: listening
    }
  }

  var body: some View {
    let list = items
    Group {
      if entry.data == nil {
        Text(provisionedAppGroups().isEmpty ? "This install has no shared app group, so the widget can't read Familiar's data." : "Open Familiar once to set up the widget.").font(.system(size: 12)).foregroundColor(text).multilineTextAlignment(.center)
      } else if family == .systemSmall {
        VStack(spacing: 6) {
          if let first = list.first { item(first) }
          if list.count > 1 { item(list[1]) }
        }
      } else if family == .systemMedium {
        HStack(spacing: 12) {
          if let first = list.first(where: { $0 == "familiar" || $0 == "card" }) { item(first).frame(maxWidth: 110) }
          VStack(alignment: .leading, spacing: 8) {
            ForEach(list.filter { $0 != "familiar" && $0 != "card" }.prefix(3), id: \.self) { item($0) }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
      } else {
        VStack(alignment: .leading, spacing: 12) {
          HStack(alignment: .top, spacing: 12) {
            if list.contains("familiar") { familiar.frame(maxWidth: 120) }
            if list.contains("card") { card(true).frame(maxWidth: 120) }
          }
          .frame(maxWidth: .infinity)
          ForEach(list.filter { $0 != "familiar" && $0 != "card" }, id: \.self) { item($0) }
          Spacer(minLength: 0)
        }
      }
    }
    .containerBackground(for: .widget) { Color(hex: entry.data?.colors.bg ?? "#14111C") }
  }
}

struct FamiliarWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "FamiliarWidget", intent: ShowIntent.self, provider: Provider()) { entry in
      FamiliarWidgetView(entry: entry)
    }
    .configurationDisplayName("Familiar")
    .description("Card of the day, the Moon, your personal day, your book and your familiar.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

@main
struct FamiliarWidgets: WidgetBundle {
  var body: some Widget {
    FamiliarWidget()
  }
}
