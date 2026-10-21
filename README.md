<div align="center">

<img src="assets/icon.png" width="96" alt="Familiar app icon: a black cat silhouette in front of a golden moon" />

# Familiar

*your familiar knows the way.*

A study companion on iPhone for tarot, Lenormand, astrology, numerology, systems of your own and any subject you study: books become audiobooks read on the phone, your notes, readings and flashcards live next to them, and a small witch's familiar walks the path with you.

<img src="assets/hero.jpg" width="300" alt="Shadow, a black cat, walking a moonlit path lined with lanterns for each study path" />

![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-1B1F23?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-TypeScript-3178C6?logo=typescript&logoColor=white)
![iOS 17+](https://img.shields.io/badge/iOS-17%2B-0D1626?logo=apple)
![Status](https://img.shields.io/badge/status-personal%20build-D9B45B)

</div>

---

## The idea

Studying means reading dense books, connecting symbols and practising. Familiar puts that into one app:

1. **Listen and read**: a book is read aloud with the text following along, or read on real pages with "Listen from here".
2. **Think out loud**: notes tied to the exact passage, highlights and bookmarks, explanations on demand.
3. **Practise**: log readings in the Journal (tarot, Lenormand, your own decks), or keep notes and flashcards for a study subject.
4. **Keep track**: statuses, ratings, stats, streaks and a year in review.

The mascot is the point of view: *becoming familiar* is learning. Your familiar (Shadow, the black cat, by default) reads along, sleeps at night, and can be petted.

## Highlights

| | |
|---|---|
| 🎧 **Audiobooks** | Voiced on the iPhone (Kokoro) while you listen, or on GitHub; follow-along text, card view, text style, speed, sleep timer, lock screen; own-key cloud voices (Gemini, ElevenLabs) |
| 📖 **Your own books** | DRM-free EPUB, text or scanned PDF (text recognition on the phone), MP3/M4A/M4B audiobooks with chapters; "Open in Familiar" from other apps |
| 📄 **Reader** | Real pages for EPUB (or scroll), PDF pages linked to the audio, Listen from here, follows the audio, search, bookmarks and highlights |
| 🃏 **Paths** | Tarot, Lenormand (Grand Tableau, combinations), astrology (birth chart list, today's sky), numerology (Pythagorean, Chaldean, Cabalística), systems of your own |
| 🗂️ **Study subjects** | Name any subject; notes and flashcards in the Journal; simple or spaced review; flashcards from passages, highlights and notes |
| 📝 **Notes, consults, explanations** | Notes keep the time and the passage; Ask Claude consults and explanations on demand (personal build) |
| 📚 **Tracker** | Statuses, half-star ratings, relistens, diary, shelves, Top 4, ranked lists, genres, stats, streaks, year in review, share images |
| 🐈‍⬛ **Familiars** | Cat (6 coats, 2 builds, stripe and mark colours), bat, crow, spider; idle, reading, sleeping and walking poses; blinking, tail swish, petting with haptics; link a familiar to a path |
| 🌗 **Look** | Plum and gold plus four element themes, dark and light; six app icons; home-screen widget; Siri shortcuts; English and Portuguese |
| ☁️ **Your data** | Everything stays on the phone, with GitHub and file backups and a storage screen |

<div align="center">
<img src="assets/icons/classic.png" width="64" alt="Classic icon" />&nbsp;
<img src="assets/icons/plum.png" width="64" alt="Plum icon" />&nbsp;
<img src="assets/icons/water.png" width="64" alt="Water icon" />&nbsp;
<img src="assets/icons/fire.png" width="64" alt="Fire icon" />&nbsp;
<img src="assets/icons/earth.png" width="64" alt="Earth icon" />&nbsp;
<img src="assets/icons/air.png" width="64" alt="Air icon" />
<br /><sub>Classic · Plum · Water · Fire · Earth · Air</sub>
</div>

## How a book becomes an audiobook

Two ways in:

- **Your own file**, all on the phone: EPUB/PDF → chapters (text recognition for scans) → you check the sections → voiced on the iPhone while you listen.
- **Through the library pipeline** (personal build):

```mermaid
flowchart LR
    A[EPUB / PDF<br/>uploaded from the app] --> B[Split into sections<br/>GitHub Actions]
    B --> C{You check<br/>the split}
    C -->|fix note| B
    C -->|confirm| D[book.json<br/>text + timings]
    D --> E[Voices on the iPhone<br/>or Kokoro on GitHub]
    E --> F[Plays in the app,<br/>streamed or downloaded]
```

The pipeline lives in a separate **private** repository, because the books are copyrighted. `book.json` holds every section's paragraphs with start and end times, which is what makes the text follow along.

## Built with

- **App**: Expo SDK 57 · React Native · TypeScript · Expo Router · expo-audio · react-native-svg (the familiars are SVG templates recoloured at runtime) · Kokoro on Core ML · a local Expo module (AVFoundation, PDFKit, Vision) · astronomy-engine · Playfair Display
- **Pipeline**: Python · Kokoro text-to-speech · GitHub Actions
- **Design**: Figma (design system, screens, brand) and a Claude design canvas for the mascot drawings
- **Data**: local files on the device · GitHub API for backups and jobs · Open Library · Open-Meteo geocoding

## Installing (no App Store, no Mac)

[`build-ios.yml`](.github/workflows/build-ios.yml) builds the app on GitHub's macOS runners when it is run by hand on `main` (or on a `v*` tag) and publishes `Familiar.ipa` under **Releases → latest**. Runs on other branches keep the `.ipa` as a workflow artifact. Input `variant`: `personal` (default) or `public`.

Install with **AltStore Classic**: AltStore → My Apps → + (with the `.ipa` saved on the iPhone), or AltServer → Install AltStore → pick the `.ipa`. No cable is needed when AltServer runs on a computer on the same Wi-Fi.

Every push to `main` runs [`checks.yml`](.github/workflows/checks.yml) (typecheck, lint with 0 warnings, iOS bundle) and then publishes an over-the-air update ([`ota.yml`](.github/workflows/ota.yml), EAS Update, runtime = app version). Only native changes need a new `.ipa`; they wait on a `reinstall` branch and bump `version` in `app.json`.

## Development

```bash
npm install
npx expo start      # dev server
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```

- Add packages with `npx expo install`. `ios/` and `android/` are generated: configure native behaviour in `app.json` and config plugins.
- Check the versioned Expo docs before touching Expo APIs (see [AGENTS.md](AGENTS.md)).
- `src/familiar-art.ts` is generated from the mascot drawings; don't edit it by hand.

```
src/app/                    screens (Expo Router)
  (tabs)/                   Home · Library · Search · Journal · Profile
  (tabs)/(home,…,profile)/  shared screens: settings/, book/, read/, import, study/review, familiars…
  onboarding.tsx            first-launch setup
  player/[id].tsx           player
src/components/             Player, PagedChapters, PdfBook, StudyJournal, Familiar, Cards, Tableau…
src/familiar.ts             familiars and paths
src/playback.tsx · voicer.ts  audio and voicing on the phone
src/ownBooks.ts · reader.ts   imported books, reader
src/tracker.ts · journal.ts · study.ts  tracker, reading journal, study subjects
src/lenormand.ts · astrology.ts · numerology.ts · systems.ts  paths
src/i18n.ts · i18n-pt.ts    English and Portuguese
src/variant.ts              personal / public build
modules/audio-encoder/      native module: m4a, PDF text and pages, OCR, audio chapters, iPhone voices
targets/widget/             home-screen widget
```

## Status

Personal build (1.7.0), used daily. A public App Store version (no Claude, voices on the phone, bring your own books, paid extras) is being prepared. See [ROADMAP.md](ROADMAP.md).

<div align="center"><sub>Made by <a href="https://github.com/giovlnv">@giovlnv</a> with Claude.</sub></div>
