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
