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

## tapa de ux audit (real skill, 20/11)

20/11/2026 · code only · rules: tapa-de-ux-en (all 10 topics, in the skill's order), tapa-de-ux (pt) for the Portuguese strings

the earlier passes worked from older tapa de ux reviews. This one checks the branch against the real skill and fixes what's clear. AGENTS.md and the app's identity come first: the 5 palettes, Playfair, the 7-step scale, weights 400/600/700 and sentence case all stay.

reviewed: every screen and component under `src/` by code, `src/theme.ts`, `src/i18n-pt.ts`, the thrown error messages in `src/*.ts`. Not reviewed: the running app (no new live pass: the sweep's web copy is gone and rebuilding it needs web packages installed), VoiceOver order, Dynamic Type at large sizes, the widget, the PDF reader and the iPhone itself.

### topics

- **hierarchy**: one style per role, title marked in code. Spacing was not measured again (the sweep found it mostly on a 4pt rhythm).
- **typography**: scale, weights, reading size, alignment, sentence case. The font question (Playfair for headings) is the project's identity: not reopened.
- **accessibility**: names, roles and states, touch targets, motion. Contrast was measured on 19/11 and the palettes didn't change.
- **color**: one conflict, below. No loose colours added; the hex values outside `theme.ts` are the familiar art, the widget, the splash and the reader's paper colours.
- **buttons and actions**: inventory of Pressables and the 82 alerts.
- **forms**: the 37 text fields.
- **states**: errors, empty, loading, offline, success, missing data.
- **ux writing**: names, verbs, formats, punctuation, en and pt.
- **navigation**: tab bar, titles, sheets.
- **psychology**: checked through the other topics (Fitts with targets and delete placement, isolation with the accent, peak-end with the year review and the study "done" screen, Tesler with autofill). Nothing new beyond what's listed.

### rule findings the sweep didn't cover

1. **one style per role / title marked in code**: no text in the app had the heading role (0 of ~85 section, sheet and booklet titles), so the VoiceOver rotor had no headings to jump between.
2. **one style per role / sizes off the scale**: 32 text styles never set a size and rendered at React Native's 14pt default, which is off the 11/13/15/17/22/28/40 scale: settings paragraphs and buttons, card sheet lines, quotes, segment labels, empty and error lines.
3. **every control says what it is**: 243 of 274 Pressables had no role. The 19/11 pass named the icon-only ones; text buttons, rows and chips were read as plain text, never "button". Segmented controls, chips and tabs (8 places) didn't say which one was selected.
4. **every action responds**: no Pressable changed when pressed (0 of 274).
5. **motion under control**: the launch splash zooms the icon 14× on every start, also with Reduce Motion on. Toasts were never read out to VoiceOver.
6. **you are here / never colour alone**: the current tab was marked by colour only.
7. **touch target**: the date stepper's ±30-day arrows were 30pt, the day arrows 42pt; "next day" at today was disabled by colour only.
8. **the button says what it does**: 17 confirmation buttons were a bare verb ("Delete", "Remove", "Clear", "Switch", "Restore", "Keep", "Download").
9. **errors say what happened and what to do**: 19 alerts, the search error, the books-in-progress error and the ares backup status showed the raw error (`GitHub 401: {…}`, `ares 500`, `Network request failed`); three alerts were titled "Something went wrong" or "It did not work".
10. **ux writing in pt**: English left in the Portuguese app: all 4 toasts, the deck-import and listen messages, the familiar editor's tabs, the explain sheet title ("Explicar isto passage"), 15 thrown error messages and "never" in the backup date. Deck import said "1 pictures added". "Could not" and "Couldn’t" were both used; "Colors" was the only US spelling; the same tab was "Colour & eyes" in the editor and "Colour and eyes" in onboarding; one exclamation ("Finished! Free 300 MB?").
11. **label always visible / right keyboard and autofill**: labelled fields weren't tied to their label for VoiceOver; name fields gave iOS no autofill hint; "Reading for someone" asked for the name only inside the field, and its Save did nothing, silently, without one.

### contradictions with the sweep

- the sweep says 21 sizes became the 7-step scale. 32 styles with no size were still at 14pt (finding 2): fixed.
- the sweep's open item "settings rows are 17pt 700" is stale: `menuTitle` was already 600 (16 → 17 in the sweep). Nothing to do.
- no other contradiction. The sweep's uppercase booklet `h3` in card study ("Symbols", "Colours", "In a reading") fits the rule's exception for short all-caps labels.

### conflicts with the project (project wins)

- **one accent colour, only on what's tappable**: gold is also on non-tappable text (big figures, card-study headings, the booklet tag). It is Familiar's signature ("gold for the one thing that matters"), so it stays.
- **motion**: the den's pet animations are the interaction itself (the rule's "essential" exception), and the sheets slide because that's the iOS sheet presentation.

### fixes

- `83093d3` a11y: a `Pressable` wrapper (`src/components/Pressable.tsx`) gives everything tappable the button role and dims it while pressed (backdrops and the den opt out); selected state on segmented controls, chips and tabs; stepper arrows at 44pt with a disabled state; the listen button says "Pause" while playing.
- `0affed6` a11y: 83 titles carry the heading role.
- `0a69936` a11y: the splash only fades under Reduce Motion; the current tab shows a filled icon, the others outlines.
- `c201b8a` type: the 32 size-less styles are 15pt (line height 20 → 21).
- `5ee7fc6` states: `errorText()` (`src/errors.ts`, tested in `src/errors.test.mjs`, `npm test`) turns errors into plain sentences that keep the code in parentheses; specific alert titles; toasts translated and announced; deck and listen messages translated with real singulars; dates in the app's language; 50 pt strings.
- `3694283` ux writing: verb + object on 17 dialog buttons, editor tabs translated, one name for the colour tab, "colour" everywhere, no exclamation.
- `e3b3768` forms: 11 labels tied to their fields; autofill for name and username; visible labels and a "name missing" message in "Reading for someone".
- `783ffae` ux writing: the explain sheet title is one translated sentence.

all of it is JS/TS: OTA-safe, no native change, no version bump.

### left open

- **label always visible**: some fields still have only a placeholder, with a heading or a button nearby: the reading's question, the flashcard and note editors, the player note, the consult question, the key and token fields in onboarding and settings. Adding labels changes those layouts, so it's a design call.
- **reading size for fields**: text fields are 15pt; the rule wants 16+ (17 on iPhone). Moving `input` styles to 17 is a scale decision.
- **the name says what's there**: the settings row for palette, mode and icon is called "App"; "Appearance" would say it. Left as it is in case the name is deliberate.
- **empty and error states**: "Book not found.", "Reading not found." and "Familiar not found." are a bare line with no way forward besides the header back. "Its 1 notes and 1 flashcards…" (study subject delete) still has no singular.
- **needs the iPhone**: VoiceOver order and how the new heading and button roles read; the dim-on-press feel; the filled tab icons; 15pt text where it was 14; Dynamic Type at the largest sizes; whether the sheets' slide follows Reduce Motion.
- `eslint .` reports 1 warning in `modules/audio-encoder` (the native module's JS side, untouched); `expo lint` and `eslint src` are at 0.

### Mars

- these commits are local on `ux/sweep-2026-11-20` (14 on top of d31b709); push from the laptop and open the PR. Merging ships as an OTA update.
- try it on the iPhone with VoiceOver for a minute: the rotor's Headings, a tab, a segmented control and an error alert.
