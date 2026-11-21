# ux review (tapa de ux)

19/11/2026 · code only · rules: tapa-de-ux-en

reviewed: `src/theme.ts` (5 palettes × dark/light), `src/components/`, every screen under `src/app/`, `src/i18n-pt.ts`. not reviewed: the running app, VoiceOver order, Dynamic Type at large sizes, the PDF reader and the widget (needs the live pass).

overall: a rich app with a consistent palette system, every UI string translatable, Dynamic Type never blocked, `hitSlop` on almost every small control and confirmations before deletes. Its weak spot is the same as calliope's: icon buttons that VoiceOver can't name.

## blocks use

1. **every control says what it is**: 30 icon-only buttons had no name, so VoiceOver read just "button" or nothing: the mini-player (back 15s, play/pause, stop), the full player's play and close, add, share, list and book options, previous/next in the journal and the reading log, the date stepper, delete reading, remove voice/name, the study color swatches, the half-star rating, and the dimmed backdrops that close sheets. **fixed**: each now has `accessibilityRole="button"` and a name through `tr()`, with Portuguese added to `i18n-pt.ts` (17 new strings). Play/pause says which one it will do; the stars say "3.5 stars".
2. **contrast** (light mode only; dark mode passes in every palette): the accent `gold` in Plum light was 3.9:1 on the background and 3.5 on raised surfaces. The `claude` color was 3.9–4.1 on raised in all palettes. `dim` (supporting text) and `explain` were 4.1–4.5 on raised. **fixed**: darker light values in each palette, all now at 4.5 or more on bg, panel and raised. Dark mode is untouched.

## confuses

3. **one format per data type**: "{0} book(s) restored." **fixed**: real singular and plural, in both languages.
4. **reading size**: running text is mostly 15–16pt, below iOS's 17pt body, and there's text at 9–11pt (counters and tags). Not changed. Proposal: 17pt for reading text (journal entries, explanations), 11pt minimum everywhere.

## finish

5. **one style per role**: 21 font sizes (9 to 46). Proposal: a 7-step scale (11 / 13 / 15 / 17 / 22 / 28 / 40).
6. **few weights**: 500, 600, 700 and 800 written as both `'600'` and `"600"` in different files. Proposal: 400 / 600 / 700 only.
7. **the font fits the product**: Playfair Display for headings with the system font for body text reads classic, mystical and bookish, which seems right for a tarot and reading app. Flagging it only as a deliberate choice; no change.

## 20/11: second pass + unslop

20/11/2026 · code and a live pass · rules: tapa-de-ux-en

no app code changed after the 19/11 review (fe2d11c is still the last code commit), so this pass carries out the proposals it left as "not changed" and adds a live pass.

### live pass (web build at 390 × 844)

the app was run with `expo start --web` in a throwaway copy outside the repo. Native-only modules (file system, secure store, widget, audio encoder, executorch, view-shot) were swapped for in-browser shims there, and every request that wasn't to localhost was blocked, so no real data or backend was touched and nothing from that copy is committed. A fresh install was used (onboarding skipped). Checked: onboarding, home, library, search, journal, profile, settings, your familiars, card study. Card images and covers come from the network, so they show as placeholders; the iOS font and spacing differ a little from Chrome's.

- **visible navigation / the button says what it does**, **fixed**: on home, the day card's "Write" button was cut off at the card's right edge at 390pt ("Log yours" + "Write" + share don't fit next to two cards). The row now wraps. The small pill buttons are about 30pt tall; `hitSlop` brings them to 44.
- **one style per role**, **fixed**: the journal's "Readings" heading was 17pt system bold, while every other section heading ("Booklet", "Currently reading", "Top 4") is Playfair. It's now Playfair 22 like the others.
- **reading size**, **fixed**: on profile, "Set up your profile" wrapped to three lines between the avatar and the familiar (both 84pt). Both are now 72pt, and the title takes two lines.
- passes: empty states on library, journal and profile all name the next step ("Log your first reading…" with a button, "Add a book below…"), the tab bar is visible everywhere, and settings groups have clear section labels.

### carried out from 19/11

4. **reading size**, **fixed**: explanations, card text in the card sheet, the card-study booklets, Claude's answer and the reading note are now 17pt with a 25pt line height (they were 15/21–22). Nothing is below 11pt (the 9 and 10pt year axis, tableau numbers, the "with you" badge and the card-study star went to 11; the blank card and cover fallbacks never go below 11).
5. **one style per role**, **fixed**: 21 font sizes → the 7-step scale 11 / 13 / 15 / 17 / 22 / 28 / 40 (12→13, 14→15, 16→17, 18→17, 19–21→22, 24–30→28, 38/46→40, with line heights scaled to match). Kept outside the scale on purpose: the astrology glyphs, the date-field separators, the familiar mark glyph and the share card wordmark. The user-set reader size (`textStyle`) is untouched.
6. **few weights**, **fixed**: 500 and 800 are gone; 400 / 600 / 700 remain. The 800 and 700 figures (stats tiles, year in review, list ranks, storage total, journal count) and the profile name are now Playfair, like numerology already was, with lining numerals so 0 doesn't read as o. `'600'` vs `"600"` follows each file's own quote style; not changed.

### unslop

direction (polish mode; Familiar already has a real identity, so it's kept):

- **product**: a tarot, Lenormand and reading companion that keeps a journal of cards, books and audiobooks, with a familiar who goes along.
- **character**: nocturnal, bookish, a little playful.
- **world**: a night path under the moon, old card booklets, ink on cream paper.
- **moments**: the familiar art and the onboarding night scene; the card of the day.
- **signature**: Playfair for anything you'd read in a printed booklet (headings, card names, big figures), gold for the one thing that matters on each screen.

audit: no hue gradients, glows, emoji, exclamation marks or hype words were found; palettes, icons (Ionicons only) and motion were already under control. The signs that were there are uppercase tracked labels (about 25 styles plus 16 all-caps strings), 800-weight system figures, and the system-font wordmark on onboarding.

changes:

- **type**: section labels, sheet headers, tags (`TAROT · CALCULATED` → "Tarot · calculated"), the mini-player kind, the diary month headings and the onboarding/familiar-editor form labels (`BIRTH DATE`, `COAT`, `WHAT ARE YOU HOPING FOR?`…) are sentence case with no letter spacing, in English and Portuguese. The home tag went from 11 to 13pt, since it no longer gets help from caps. Kept on purpose: the card-study booklet `h3` (a printed-booklet heading in Playfair caps, part of the booklet look), the share card's spaced "FAMILIAR" wordmark, the `DD / MM / YYYY` placeholders and the `COTD` abbreviation.
- **brand**: the onboarding wordmark "Familiar" was 46pt system medium; it's now Playfair at 40, and the tagline is Playfair italic instead of system italic.
- **figures**: see 6 above.
- not changed: spacing (already mostly on a 4pt rhythm, the outliers are small), colour (the 5 palettes are the identity and passed contrast on 19/11), layout and motion.

### open proposals

- check on the iPhone: Playfair's `lining-nums` on the big figures (Chrome honours it; iOS should, since the font has `lnum`), the wrapped day-card buttons with long Portuguese labels, and VoiceOver order.
- card study opens on a tall empty band above the title in the web build (the cover image needs the network there); check it on the device, and if it's empty, the cover could be shorter.
- the tab bar shows "Home" as active on shared routes reached from another tab (settings, your familiars) in the web build; check on iOS.
- the settings rows are 17pt 700. With the new scale, 600 would be enough and match the other list titles.
