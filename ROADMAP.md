# Roadmap

What's done and what's pending, kept short. The detailed history of every decision and feature lives in the project docs (and in `git log`).

Last revised: 21 Oct 2026 · app 1.7.0 · two builds from one code base: **personal** (Claude, everything free) and **public** (App Store, no Claude, paid extras)

---

## Done ✅

**Listening**
- Audiobook player: follow-along text, notes, speed menu, 15 s skips, mini player, sleep timer, lock screen, text style, card view per section
- Voices made on the iPhone (Kokoro) or on GitHub; streaming or downloaded audio; own-key cloud voices (Gemini, ElevenLabs); Arabic with the iPhone voice
- Explanations on demand, Listen off by default; saved explanations; Ask Claude consults (personal build)

**Books**
- Add books through the library pipeline (split review, cancel), or import your own: DRM-free EPUB, text and scanned PDF, MP3/M4A/M4B audiobooks with chapters, "Open in Familiar"
- Reader: EPUB with real pages (or scroll), PDF pages linked to the audio, Listen from here, follows the audio
- Search in books and notes; bookmarks and highlights; export audio
- Book overview: Sections, Notes, Consults and Flashcards
- Tracker: statuses, ratings, diary, shelves, Top 4, lists, genres, stats, year in review

**Paths**
- Tarot, Lenormand, astrology, numerology (Pythagorean, Chaldean, Cabalística), systems of your own
- Study subjects: notes and flashcards in the Journal, simple or spaced review, flashcards from passages, highlights and notes
- Home and Profile pages per path; books tagged to paths

**Familiar and look**
- Familiars (cat, bat, crow, spider), poses, petting, sleep, idle animations, onboarding, empty states
- Themes, six app icons, widget, Siri shortcuts, share images and streaks
- Portuguese app UI (French and Arabic for books and voices); pronouns

**Data and launch prep**
- Local data, GitHub and file backups, storage screen
- Public build switch; paid plans and prices decided; privacy policy and App Store labels drafted

---

## Pending 📋

**Now**
1. Test 1.7.0 on the iPhone

**Public version**
2. AI provider + small server for on-demand explanations and credits
3. Free and paid tiers with StoreKit
4. Privacy policy online (English and Portuguese)
5. TestFlight → App Store
6. Accounts + sync, then Android

**Design (with the illustrator)**
7. Expressions (angry, silly, happy)
8. Element vial redesign
9. More poses and per-path props
10. Study subject emblem
11. Wordmark fine-tuning
12. Later for the public build: petting sounds, paid familiars (owl, toad, snake), accessories

**Only when a book needs it**
13. Western "Kabbalah 22" numerology, Hebrew gematria
14. Meanings for Lenormand, astrology and numerology from books

---

## Constraints

- Copyrighted books and audio stay in the **private** library repo; this repo is public so iOS builds are free
- 2,000 free Actions minutes/month on the private repo; voicing on the phone keeps that low
- Native changes need a new `.ipa` + reinstall; everything else arrives over the air
