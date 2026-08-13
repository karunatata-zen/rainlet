# Rainlet — spec

A cute little pixel pet that sits out in the rain, with rain sounds to go with
it, for e-ink readers. Nothing leaves the device; nothing needs to be
downloaded.

> Name is **Rainlet**, set in one config constant so it is cheap to change.

Reference: [rekindle.ink](https://rekindle.ink/) — a dashboard for
Kindle/Kobo/Boox. We borrow its "one static page that works in a Kindle
browser" shape and its cozy-over-utilitarian styling, but **not** its app
launcher. Rainlet is deliberately two cards: **a pet in the rain** and **rain
sounds**, plus the **pixel rain** behind everything.

> **Scope note.** This spec has been cut down twice, both times at the user's
> request. First the ReKindle-style launcher — app grid, categories,
> favourites, weather, calendar — went. Then the music and video players
> themselves went, in favour of a looping pixel animal: _"maybe instead of
> music and video player, keep the rain sounds but add an animated cat in rain,
> dog or few pet animations and let it play in loop."_ Sections below describe
> the current scope only.

---

## 1. Goals

1. Look **very cute** — pastel, rounded, pixel-art, gently animated.
2. A **pet animation** you can leave looping on a propped-up Kindle.
3. **Rain sounds** that need no files, no account and no network.
4. A **pixel rain** backdrop that feels alive and moves with the sound.
5. Work in an actual e-reader browser, not just as a pretty desktop demo.
6. Ship as a single static site — open it, it works.

## 2. Non-goals (v1)

- No backend, no accounts, no server-side uploads. Everything is local.
- No app launcher, calendar, weather, notes, or favourites.
- No music player, no video player, no media library. Removed on request; the
  one upload slot that survives is the optional custom backdrop (§6).

---

## 3. The e-ink tension, and how we resolve it

Cute animated pixel rain and e-ink hardware want opposite things. A Kindle
browser is grayscale, refreshes slowly, ghosts, and has a weak CPU. A
full-framerate canvas animation there is unusable and will drain battery.

**Resolution: two display modes, auto-detected, always manually overridable.**

|              | Cozy mode              | Paper mode                        |
| ------------ | ---------------------- | --------------------------------- |
| Target       | Desktop, phone, tablet | Kindle / Kobo / Boox              |
| Palette      | Full pastel color      | Pure black & white, dithered      |
| Rain         | 30fps canvas, smooth   | ~2fps stepped, or frozen still    |
| Transitions  | Fades, bounces         | None — instant swaps              |
| Shadows/blur | Yes                    | Replaced with 1px hard borders    |
| Pet loop     | 4fps                   | 1fps — a held pose, not a stutter |

Detection: user-agent hints for known e-readers, plus
`matchMedia('(monochrome)')`, plus a low `screen.colorDepth`. Wrong guesses are
cheap — an Auto / Cozy / Paper toggle sits at the top of Settings, and the app
re-checks if the OS flips monochrome or reduced-motion while it is open.

`prefers-reduced-motion: reduce` forces the rain to a still frame in either
mode. Paper mode is also the accessibility-safe default for anyone who finds
the animation distracting.

---

## 4. Visual language

**Palette (Cozy).** Warm paper base, sky accents, one candy highlight.

| Token        | Hex       | Use                         |
| ------------ | --------- | --------------------------- |
| `--paper`    | `#FDF6EC` | Page background             |
| `--ink`      | `#3A3238` | Body text                   |
| `--ink-soft` | `#7C7079` | Secondary text              |
| `--rain`     | `#A8C7E7` | Rain droplets, links        |
| `--mint`     | `#B8E0D2` | Category chip, success      |
| `--peach`    | `#F7C9B8` | Hover, warm accent          |
| `--candy`    | `#E8A0BF` | Favorites star, now-playing |
| `--line`     | `#E2D6C8` | Borders, dividers           |

Paper mode collapses all of these to `#FFFFFF`, `#000000`, and two dither
patterns standing in for the mid-tones.

**Type.** A pixel display face for headings, numerals, and buttons — bundled
locally, no CDN, so it works offline on-device. A normal system sans for body
copy and anything long, because pixel fonts are miserable to read in paragraph
form. Sizes step in whole pixels to avoid blurry glyph edges.

**Shape.** 4px hard corners, 2px borders, no gradients. Cards look like little
stickers. Buttons visibly depress by 2px when pressed.

**Motifs.** A **cat under an umbrella** as mascot, sitting in the header and
changing expression with the rain sounds — dozing with a drifting `z` when
silent, ears up and tail flicking while a sound plays. Tapping it
pets it: `^ ^` eyes, two hearts, and a small purr in the toast for about a
second and a half, then back to whatever it was doing. Drawn on a 16×16 pixel
grid.
Other icons are inline SVG on the same grid, so they stay crisp and need no
image requests.

---

## 5. Layout

Single screen, no routing. Everything else is an overlay panel.

```
┌──────────────────────────────────────────────┐
│  🐱 Rainlet                    14:32  ·  ⚙  │   header strip
├──────────────────────────────────────────────┤
│   ┌──── rain friend ─────────────────────┐   │
│   │ ┌──────────────────────────────────┐ │   │
│   │ │      (  pixel pet in rain  )     │ │   │   pet card
│   │ │            4 : 3                 │ │   │
│   │ └──────────────────────────────────┘ │   │
│   │ 🐱 Cat 🐶 Dog 🦆 Duck 🐰 Bunny 🐸 Frog │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   ┌──── rain sounds ─────────────────────┐   │
│   │ 🌧 Gentle  ⛈ Storm  🌊 Sea  🔥 Fire  │   │   ambience card
│   │ 💧 ────────────●─────────────────    │   │
│   │ ▁▃▅▂▅▃▁▂                             │   │
│   └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
        ( pixel rain falls behind all of this )
```

Settings is an overlay panel, so the main screen never scrolls out from under
you. The two cards stay in a single column at every width, centred in a 1100px
shell — with only two of them, a side-by-side layout would just make each one
narrower for no gain, and a Kindle is portrait anyway. Touch targets are never
smaller than 44px, which is what a Kindle's imprecise touch layer needs.

In Paper mode every card keeps its shape, so the layout does not jump when you
switch modes.

---

## 6. Pixel rain

**Canvas-generated by default.** A canvas version is a few KB instead of
several MB, stays sharp at any resolution, can recolor per theme, can slow to
1fps for e-ink, and can react to the rain sounds. A video file does none of
that, so canvas stays the default.

**Custom video/GIF backgrounds** are supported as an alternative. Settings has
an "upload your own background" slot accepting `video/*` and `image/gif`. The
file is stored in IndexedDB, looped muted behind the UI,
and dimmed by an adjustable scrim so text stays readable. Canvas rain can be
layered on top or switched off. Cozy mode only — video on e-ink is a slideshow
at best, so Paper mode falls back to canvas rain and says so in Settings.

**Look.** Droplets snap to an 8px grid so everything reads as pixel art, never
as smooth vector lines. Three parallax layers at different speeds and opacities
give depth. Droplets are 1–3 cells tall, and on landing they pop a two-frame
splash. Occasionally a droplet is a tiny heart or star instead — roughly 1 in
200, just enough to be a nice surprise.

**Scenes** (pick in Settings, default Drizzle):

- **Drizzle** — light, slow, sparse. The calm default.
- **Downpour** — dense and fast, with the odd lightning flash.
- **Snow** — droplets drift sideways and settle into a bottom crust.
- **Sakura** — pink petals tumbling instead of rain.
- **Stars** — falls upward, night palette. For evening reading.

**Sound reactivity.** With a rain sound playing, a `WebAudio` `AnalyserNode`
drives the rain: bass raises the fall speed, mids raise the spawn rate, and a
treble transient makes a droplet flash white. Kept subtle — ambient, not a
visualizer toy. Off in Paper mode and under reduced-motion.

**Performance budget.** Cap at 300 droplets and 30fps in Cozy, 60 droplets and
2fps in Paper (measured against a Kindle 11th gen; older readers should drop to
1). Single canvas, `requestAnimationFrame`, one fill per layer,
paused entirely when the tab is hidden. Target under 5% CPU on a laptop.

---

## 7. The pet

The first card, and the thing you actually leave on screen: one animal sitting
out in the rain, looping forever. Five to choose from — **cat, dog, duck, bunny,
frog** — as chips under the stage. Tap the animal and hearts pop.

**Drawn, not filmed.** Each pet is four frames of pixel art written as a
character grid (`src/pets/sprites.js`), one character per pixel on a 40×32 grid,
turned into SVG at draw time with runs of the same colour merged into single
rects. A video would be megabytes, would need sideloading, and would dither
badly on e-ink; the whole cast here is a few KB of text and repaints as flat
regions the panel can handle.

**Style.** Seated front-facing animals copied from the reference art the user
supplied: a full dark outline, big glossy eyes, blush cheeks, a tiny nose and
tongue, a cream chest, and a heart and a sparkle floating alongside. The outline
is not just decoration — it is what lets Paper mode collapse every fill to white
and still read as a line drawing rather than a silhouette.

**How they are drawn.** Not as hand-typed borders, which came out boxy. Each
animal is a **silhouette of row spans plus a feature list**; the silhouette is
filled, then the outline is _derived_ from whichever cells touch the outside.
That derivation is what gives the reference's rounded corners. Features paint
over the fill clipped to the silhouette, except the ones flagged free — the
floating heart, the sparkle, the bunny's flower.

**Proportions.** A round head over rows 4–17 narrowing to a neck at row 18, a
seated body over rows 18–28, and a tail sweeping up to the right. Eyes are 6×5
rounded blocks with a two-pixel glint, close enough together to read as one
face. Cat, dog and bunny share the head shell and body and differ only in ears
and props: a matched set reads as one family of drawings, and the differences
land harder for it. Duck and frog are rounder and earless.

**Frames.** Base pose, tail flick, blink, and one animal-specific beat — an ear
flattened by a drop, a dog shaking off water, a quack, a nose twitch, a croak.
Each frame is written as the base plus a short patch list rather than as a
second full drawing. 4fps in Cozy, 1fps in Paper, where a held pose reads as
deliberate instead of as a stutter. Reduced-motion gets a single still frame.

**Colour.** One shared palette of CSS variables; each animal overrides only the
few it needs, set inline on the stage element. Switching pets clears the whole
override set rather than just the incoming animal's keys, or a variable the
previous pet set and this one does not — the duck's orange beak, say — would
follow it. Paper mode clears them all so the black-and-white stylesheet wins.

---

## 8. Make your own friend

A sixth pet, drawn by you. The chip after the five animals opens a panel with a
drawing grid, a palette and a **Use a picture** button; save and the pet joins
the row, kept in `localStorage` and restored on the next visit. Delete puts it
away again.

**A coarser grid than the stage.** Drawing is 20×14, half the stage's 40×29,
and every drawn cell becomes a 2×2 block. Forty columns across a Kindle is a
9px target that no finger can hit; twenty is twice that, and 2×2 blocks happen
to match the chunk size of the built-in art, so a hand-drawn pet sits in the
same scene without looking finer than the rest of it.

**Elements, not a canvas.** The grid is 280 spans with one listener on the
container hit-testing from coordinates. A canvas would need its own hit-testing
and would blur on a non-integer device ratio; per-cell listeners cannot follow a
finger that leaves the cell it started in. Touch events are prevented so a drag
draws instead of scrolling the panel.

**Palette characters, not colours.** A drawing stores the same characters the
built-in art uses — outline, body, eyes, blush — so Paper mode collapses a
custom pet to a line drawing for free, exactly as it does the others. Eleven
inks and an eraser: enough to draw an outlined animal with a face. Each swatch
carries a literal hex for the editor only, because the CSS variables are two
colours in Paper mode and the palette would be a row of identical squares.

**Pictures are fitted and averaged.** An uploaded image is scaled to fit rather
than stretched, each destination cell is the mean of the pixels under it, and
the result is matched to the nearest ink by a green-weighted RGB distance.
Averaging first is what turns a photo into something that survives being 20
pixels wide instead of a field of noise; mostly-transparent cells stay empty, so
a cut-out keeps its shape. Then you tidy it by hand — the quantiser gets you a
rough shape, not a finished pet.

**Two frames, not four.** There is no way to know where someone drew the eyes,
so a custom pet cannot blink. Instead the whole animal breathes — up a pixel,
down a pixel — which reads as alive and costs one extra frame. It carries no
colour overrides, so it uses the shared palette as-is.

The drawing is 280 characters in `localStorage`, separate from the settings
keys. It never leaves the device unless you deliberately share it.

**Sharing: the pet travels inside the link.** 280 characters fit in a URL, so
`Share` in the maker produces `…/#p=…` and there is no backend, no upload and
no account. Run-length encoding takes a typical drawing down to a few dozen
characters — a drawing is mostly empty cells — and no ink character is a digit,
so counts and pixels never blur. Opening such a link puts the stranger's pet on
the stage with **Keep them / No thanks**; it is not saved until you keep it,
because a link should not be able to overwrite the animal you drew just by
being opened, and keeping over an existing one asks first. Either answer drops
the pet out of the address bar so a reload does not offer it twice. The hash is
read on `hashchange` as well as at boot, since a link followed from an open page
never reloads.

The link is shown in a field as well as copied: the Kindle's browser has no
clipboard API, and `execCommand` is the fallback before that.

---

## 9. Clock

Local time in the header, in pixel numerals, tapped to toggle 12/24h. Ticks
once a minute, not once a second — seconds would thrash an e-ink refresh sixty
times more often for no benefit. The tick is scheduled to the next minute
boundary rather than on a 60s interval, so it does not drift.

---

## 10. Rain sounds

Five built-in ambiences — Gentle rain, Big storm, Seaside, Little creek,
Fireplace — as tap-to-toggle chips with their own volume slider.

**Synthesised, not sampled.** Each one is about three seconds of brown-tinted
noise on a loop, shaped by a highpass/lowpass pair and swelled by a slow LFO so
it never sounds like a stuck sample. Thunder rumbles and fire crackles are
scheduled noise bursts through a steep filter, sharing one helper — the only
difference between a distant rumble and a nearby pop is the envelope and the
cutoff. That is roughly 3KB of code for the whole shelf, with nothing to
download, nothing to license, and full function offline, which matters a lot on
a device that is usually not on wifi.

**Why not a library of clips from YouTube.** It was asked for and it is not
here, deliberately. Downloading audio or video from YouTube to redistribute
through this app breaks their terms of service, and an embedded YouTube player
will not run in a Kindle's stock browser anyway — so the feature would be both
a licensing problem and non-functional on the target device. Synthesis gives
the same result for rain and fire; for anything else, the backdrop upload slot
takes your own file.

The ambience drives a three-band level shape — bass, mid, treble — which feeds
both the pixel rain and the small level meter under the slider, so the scene
moves with what you are hearing.

---

## 11. Idle mode

Left alone for a minute, the page stops being a page. The top bar, the rain
sounds card, the chips and the footer fade out and collapse, and the scene
grows to fill the screen: one animal, in the rain, and nothing else. Any tap,
key or scroll brings the interface straight back.

**Why it exists.** Without it this is a dashboard you visit. A Kindle propped
on a desk should show an animal in the rain, not a page of controls, and asking
someone to press a "full screen" button is asking them to do the work the site
should be doing.

**Nothing is removed from the DOM.** Waking has to be instant, and rebuilding
the scene on a Kindle is a visible flash. Idle is a single class on `<body>`;
the layout is the stylesheet's business. The hidden pieces are collapsed as
well as faded — faded alone, they still take up room and the scene would size
itself around things nobody can see.

**The waking tap only wakes.** Pointer events are captured and prevented, but
that does not stop the click a mouse press generates, so the pet and the mascot
both ignore a click that lands within 400ms of waking. Otherwise the tap meant
to bring the interface back also pets the animal.

Idle never fires over an open dialog — the settings you were halfway through
must not vanish behind the pet — and the timer stops while the tab is in the
background, since a tab nobody is looking at is not being watched. Paper mode
already disables transitions globally, so the fade is Cozy-only; reduced motion
switches it off too.

---

## 12. Saving the scene as a picture

A **Save as a picture** button under the pet writes the scene out as a
1072×1448 PNG — a Kindle 11th gen's panel at its own resolution, so nothing is
resampled on the way in.

**Called a picture, not a screensaver.** Amazon does not let you replace the
lock screen on a stock Kindle. Naming the button "screensaver" would be a
promise the device breaks, so the hint — shown only once a save has actually
succeeded — says to copy the file over USB and open it from the photo viewer,
and says plainly that the real lock screen needs a jailbroken reader.

**Black and white, dithered here.** Colour is no use on the panel, and letting
the reader work out its own greys from a colour PNG gives muddier results than
choosing them. Each palette character maps to a lightness and a 4×4 Bayer
matrix turns that into pure black or white, so a mid tone becomes a stable
texture rather than a flat grey the device will dither for itself, differently.

**The same grid the stage draws.** `sceneGrid()` composes the scene once and
both the stage and the export read it, so the file is the picture you were
looking at rather than a second drawing that drifts out of step. Cell size is a
whole number of pixels — a fractional cell would put a seam through art made of
squares — and the art hangs slightly above centre, the way a picture is hung.

Saving falls back from `toBlob` to `toDataURL`, and from a download link to
simply opening the image, for browsers that cannot hand a file over. The
Kindle's own browser is one of them, which is fine: the file has to come from a
computer over USB anyway.

---

## 13. Settings panel

Display mode (Auto / Cozy / Paper) · Rain scene · Rain intensity ·
Sound reactivity on/off · Custom background (upload / show / scrim opacity /
rain overlay on-off / remove) · 12/24h clock · Storage usage ·
Reset preferences · About.

Written to browser storage on change, applied immediately, no save button.
"Reset preferences" clears settings; it never touches an uploaded backdrop.

---

## 14. Storage schema

`localStorage` under a `rainlet:` prefix for small settings:

```
rainlet:settings     { mode, scene, pet, intensity, reactive, clock24,
                       bgEnabled, bgScrim, bgRainOverlay }
rainlet:custom-pet   "OOFF.....…"   // 280 chars: the pet you drew (§8)
```

IndexedDB `rainlet-media` for the one heavy value:

```
backgrounds  { id, name, mime, size, addedAt, blob }   // single row, id "current"
```

The database is at version 3; the upgrade deletes the `tracks` and `videos`
stores the removed players used, so anyone who ran an earlier build gets that
space back rather than carrying dead blobs forever.

Every read is defensive — a corrupt or hand-edited value falls back to the
default rather than white-screening the page. Unknown keys are dropped and
values of the wrong type are ignored, so an old schema cannot break a new build.

## 15. Tech

Vanilla HTML/CSS/JS on Vite. No React, no Tailwind, and no runtime
dependencies at all.

The reasoning: this has to run on an old e-reader browser. A framework bundle
costs hundreds of KB and a lot of parse time to manage what is really one screen
and three overlays. Vanilla keeps the payload in the tens of KB and the whole
thing debuggable on-device. Vite gives us a dev server, hot reload, and a
production build without shipping any runtime. Build target is ES2015 and asset
paths are relative, so the output also works opened straight off a filesystem.

Everything else is platform APIs — canvas, WebAudio, IndexedDB, Media Session —
each behind a guard, because the Kindle browser has some of them and not others.

Output is a plain static folder, so it hosts anywhere: GitHub Pages, Netlify,
or a Python one-liner on your LAN so the Kindle can reach it.

```
rainlet/
├── SPEC.md
├── index.html
├── src/
│   ├── main.js        wiring; the only file that knows how the parts fit
│   ├── config.js      branding + per-mode render tuning
│   ├── display-mode.js
│   ├── rain/          canvas engine + scenes
│   ├── pets/          sprite grids, SVG stage, the drawing editor
│   ├── media/         synthesised rain sounds, IndexedDB for the backdrop
│   ├── widgets/       clock
│   ├── ui/            mascot, icons, backdrop
│   ├── settings/      store + panel
│   └── styles/        tokens, base, components, paper, fonts
└── src/styles/fonts/  bundled pixel font
```

## 16. Out of scope for v1

Accounts and cross-device sync · server uploads · a music player, a video
player or any media library · streaming service integration · the app launcher,
weather and calendar that an earlier draft of this spec described.

## 17. Decisions

Settled with the user before building:

1. **Name** — Rainlet.
2. **Custom video/GIF backgrounds** — yes, as an optional upload slot. Canvas
   rain remains the default (§6).
3. **Target device** — **Kindle 11th gen.** Paper mode's tuning values
   (frame interval, droplet cap, cell size, layer count) live in a single
   exported `TUNING` object in `src/config.js` so they can be adjusted against
   the physical device without hunting through the code. Tuned for gen 11:
   2fps rather than 1 (its panel takes a partial refresh fast enough), a 48px
   minimum touch target rather than 44, and a taller hit box on the sliders.
   Both gen-11 models are 300ppi portrait and land inside the existing 720px
   narrow-screen breakpoint, so the layout needed no change.
4. **Mascot** — cat under an umbrella.
5. **First scope cut** — the ReKindle-style launcher, app grid, favourites,
   weather and calendar were removed.
6. **Rain-sound library** — built as synthesis rather than as downloaded
   YouTube clips (§10), for licensing and offline reasons.
7. **Second scope cut** — the music and video players went too, replaced by a
   looping pixel pet (§7): _"maybe instead of music and video player, keep the
   rain sounds but add an animated cat in rain, dog or few pet animations and
   let it play in loop."_ The rain, the mascot, the two display modes and the
   storage layer were all kept.
8. **Pet art direction** — redrawn from four reference images the user supplied
   (cat, dog, bunny, frog): outlined chibi animals with glossy eyes and blush,
   rather than the flatter silhouettes of the first pass.

9. **Make your own pet** — a drawing grid and an image quantiser (§8), rather
   than a set of extra presets: _"you can draw your pixel character or upload
   an image to turn into one."_

10. **What makes it worth trying** — from five options the user chose sharing
    and the picture export, with idle mode folded in: _"if I build one, #1. If I
    build two, #1 and #4."_ Sharing puts a pet inside a link with no backend
    (§8), idle mode turns a propped-up reader into the scene (§11), and the
    export puts the animal onto the device as a file (§12). All three were
    picked over anything needing an account or a server.

Still to confirm during testing: the exact Kindle model and firmware, which
determines how much of modern JS the stock browser supports.
