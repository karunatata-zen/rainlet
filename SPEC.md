# Rainlet — spec

A cute little pixel pet that sits out in the rain, for e-ink readers. Nothing
leaves the device; nothing needs to be downloaded.

> Name is **Rainlet**, set in one config constant so it is cheap to change.

Reference: [rekindle.ink](https://rekindle.ink/) — a dashboard for
Kindle/Kobo/Boox. We borrow its "one static page that works in a Kindle
browser" shape and its cozy-over-utilitarian styling, but **not** its app
launcher. Rainlet is deliberately one card — **a pet in the rain** — over the
**pixel rain** behind everything.

> **Scope note.** This spec has been cut down twice, both times at the user's
> request. First the ReKindle-style launcher — app grid, categories,
> favourites, weather, calendar — went. Then the music and video players
> themselves went, in favour of a looping pixel animal: _"maybe instead of
> music and video player, keep the rain sounds but add an animated cat in rain,
> dog or few pet animations and let it play in loop."_ Then the rain sounds and
> the picture export went as well, after the user tested on a real Kindle and
> found the device can do neither (§10, §12). Sections below describe the
> current scope only.

---

## 1. Goals

1. Look **very cute** — pastel, rounded, pixel-art, gently animated.
2. A **pet animation** you can leave looping on a propped-up Kindle.
3. Work with **no files, no account and no network** — and with no sound,
   which the target device cannot produce at all.
4. A **pixel rain** backdrop that feels alive.
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
cheap — a Mode button sits under the animals (§13), and the app re-checks if
the OS flips monochrome or reduced-motion while it is open.

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

**Motifs.** A **cat under an umbrella** as mascot, sitting in the header,
dozing with a drifting `z`. Tapping it pets it: `^ ^` eyes, two hearts, and a small purr in the toast for about a
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
└──────────────────────────────────────────────┘
        ( pixel rain falls behind all of this )
```

There is no settings overlay (§13); the two switches worth having are on the
page. The card stays in a single column at every width, centred in a 1100px
shell — a Kindle is portrait, so there is nothing to gain from spreading
sideways. Touch targets are never
smaller than 44px, which is what a Kindle's imprecise touch layer needs.

In Paper mode every card keeps its shape, so the layout does not jump when you
switch modes.

---

## 6. Pixel rain

**Canvas-generated by default.** A canvas version is a few KB instead of
several MB, stays sharp at any resolution, can recolor per theme, and can slow
to 1fps for e-ink. A video file does none of that, so canvas stays the
default.

**Custom video/GIF backgrounds are gone.** They were built, and they were only
ever reachable from the settings panel; when that came out (§13) the feature
was orphaned. It was the same misjudgement as the sound and the picture export
— video on e-ink is a slideshow at best, so the one device this site is named
after could never have used it.

**Look.** Droplets snap to an 8px grid so everything reads as pixel art, never
as smooth vector lines. Three parallax layers at different speeds and opacities
give depth. Droplets are 1–3 cells tall, and on landing they pop a two-frame
splash. Occasionally a droplet is a tiny heart or star instead — roughly 1 in
200, just enough to be a nice surprise.

**Scenes** (Drizzle; the rest are in the engine but no longer pickable, since
the picker lived in the settings panel):

- **Drizzle** — light, slow, sparse. The calm default.
- **Downpour** — dense and fast, with the odd lightning flash.
- **Snow** — droplets drift sideways and settle into a bottom crust.
- **Sakura** — pink petals tumbling instead of rain.
- **Stars** — falls upward, night palette. For evening reading.

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

## 9a. Time of day

The scene follows the clock. Four phases — **dawn** (05–08), **day** (08–17),
**dusk** (17–21), **night** — each with its own sky and its own weight of rain.

**Why it exists.** With no sound and no file export, the only ambience channel
left on this device is change over time (decision 11). A scene that is
identical at 3pm and 3am is a picture; one that is not is a place.

**What changes.** A five-pixel sun sits in the top corner by day, with rays
that alternate between frames and no rays yet at dawn; a right-opening crescent
moon replaces it at dusk, and by night it is joined by six stars. Rain runs at 0.8×
at dawn, 1× by day, 1.15× at dusk and 0.65× at night, so the same scene reads
differently across a day without ever changing scene. In Cozy mode the page
palette warms at dawn and cools through dusk into night; only the sky-ish
tokens move, because an animal that changes colour at dusk reads as a different
animal rather than as evening.

**The sky is outlined, not solid, and the rain goes around it.** Both were
found by looking at the thing on a real panel rather than in Cozy mode. A
filled disc is fine in colour and a blob in Paper mode, where every token
collapses to black — so the sun and moon are drawn the way the animals are, an
outline ring with the fill inside, and Paper gives the fill white. Rain drawn
straight through them merged with them into one shape, so the rain now skips
any column that would cross the sky or the one-cell margin around it. Two rows
are left clear beneath the sky, because one row between the sun and the cat's
heart puff still read as the two of them touching.

**Things learned the hard way.** Stars are at fixed positions, and they only
twinkle in Cozy mode: a pixel that blinks on an e-ink panel reads as a fault,
and a star that moves between repaints reads as dirt. Nothing in the sky is
allowed below row 7 of the stage grid, which is where the pet's art begins.
At night the pet gets a drifting "z" beside it rather than being redrawn with
its eyes shut — some of these animals are drawings we have never seen. Phase is
checked on the minute boundary and only repaints when it actually changed.

Every per-phase CSS rule is scoped to `[data-mode="cozy"]` as well as the
phase, so it can never outrank the Paper overrides that flatten the same tokens
to black and white.

Wiring this up exposed an older bug: sprite rows were painted onto the stage
with spaces treated as an eraser, so every pet was quietly wiping the backdrop
above the ground. The stage rain had not been visible since the pet landed on
it. A space inside a sprite is now empty air, and the rain — and the sky behind
it — shows through.

---

## 9b. Real weather

The scene can follow the sky where you actually are. Off by default; switched
on with the **Real sky** button under the animals.

**Why it exists.** The sun was on a clock and the rain never stopped, so a
clear afternoon showed a sunshower every single day. Someone looking at their
own window and then at this page could see it was made up. Weather from
outside makes the odd combinations honest: a sunshower now only appears when
there genuinely is one where you are.

**How it works.** `current=weather_code,is_day` from open-meteo — free, no key,
CORS-open, which is the only reason a static site can do this at all. Position
comes from low-accuracy geolocation (8s timeout) or from a lat/long you type
into the field beside that button. The 28-entry WMO code table collapses to six skies we can draw:
clear, fair, cloudy, fog, rain, snow, storm. Each carries a rain multiplier —
clear 0, fair 0.15, rain 1.15, storm 1.6 — and a "covered" flag.

**What changes on screen.** Wetness scales both the canvas rain and the number
of stage rain columns (11 down to none), and below 0.05 the puddles disappear
too: a puddle under a clear sky is exactly the detail that makes the rest look
painted on. When the sky is covered, a drifting cloud replaces the sun, moon
and stars entirely.

**Rules the code is built around.** It may never block the page: the scene is
already drawn from the clock before any answer arrives, there is no spinner,
and every failure path — offline, refused, aborted, bad JSON — falls through
silently to what was already there. Readings are cached for 30 minutes and a
stale one is shown while a fresh one loads. Re-checks happen when the page
becomes visible again, which on a reader is the moment the cover opens; there
is no timer. Coordinates are rounded to two decimals (about a kilometre)
before being sent.

**Off by default, and switchable off.** A permission dialog thrown at someone
before they have decided they like the page is a page they close. And a site
called Rainlet that shows no rain for a week is not a trade worth forcing on
anyone, so the toggle gives back unconditional rain.

**Things learned the hard way.** The manual lat/long box exists because a
Kindle can refuse or silently fail to geolocate, and "it did not work" is not
something a user can act on. A cached reading is published _synchronously_
during construction, before the controls exist — without a boot guard
that threw a TDZ error on load. The rain columns had to be interleaved rather
than kept left-to-right, or thinning rain huddled down one side of the stage.
And the first cloud was nine columns wide: a Paper-mode screenshot showed it
running straight into the cat's ear, where two black shapes become one. It is
seven columns now, the same footprint the sun already occupies, and lopsided
rather than symmetrical — an even-sided one read as a hat.

---

## 10. Rain sounds — removed

There were five synthesised ambiences here: gentle rain, storm, seaside, creek,
fireplace, each about three seconds of shaped noise on a loop, driving a
three-band level shape that nudged the rain and a small meter.

**They are gone because a Kindle cannot play sound.** Not "plays it badly" —
there is no audio path at all from the stock browser. The gen-11's only audio
is Audible over Bluetooth, which a web page cannot reach. The library was
argued about carefully on licensing grounds (synthesis rather than clips
lifted from YouTube) while nobody checked whether the target device can make a
noise. That was the wrong question answered well.

What is left of it: nothing in the code. `reactive` is gone from settings, the
level meter and the rain's audio coupling are gone from the engine, and the
mascot's playing/paused faces went with them. Cozy-mode browsers can play
sound, but a feature that only works everywhere except the device the site is
named after is not worth the surface area.

---

## 11. Idle mode

Left alone for a minute, the page stops being a page. The top bar, the chips
and the footer fade out and collapse, and the scene
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

Idle never fires over an open dialog — the pet you were halfway through
must not vanish behind the pet — and the timer stops while the tab is in the
background, since a tab nobody is looking at is not being watched. Paper mode
already disables transitions globally, so the fade is Cozy-only; reduced motion
switches it off too.

---

## 12. Saving the scene as a picture — removed

A **Save as a picture** button wrote the scene out as a dithered 1072×1448 PNG,
the gen-11 panel's own resolution.

**It is gone because a Kindle cannot save or open image files.** The stock
browser has no downloads, and there is no photo viewer on the device to open
one with. This was half-known when it shipped: the code's own comments noted
the browser could not download, and the button shipped anyway with a hint
telling the user to open the file "from the photo viewer" — an app that does
not exist on a stock Kindle. Working on a desktop browser is not the bar; the
bar is the Kindle.

The lesson kept from it: features here have to be checked against what the
device can actually do before they are built, not after.

---

## 13. Controls (there is no settings panel)

There was one. On the real Kindle the gear did nothing: the overlay never
opened, and because the device has no console there was no way in and no way to
tell why. An overlay is one more component that can fail, and when it fails it
takes every setting behind it with it. So it is gone, along with the custom
video/GIF background (§6), which was only reachable from inside it and could
never have played on this device anyway.

What survives sits on the page, under the animals, behind a dotted rule so a
tap meant for the frog does not flip the display mode:

- **Mode** — Cozy ⇄ Paper. The label says what tapping will _give_ you, not
  where you are, because there is no hover and no tooltip on this device. It
  writes an explicit mode rather than `auto`: anyone reaching for it has
  already decided the automatic answer was wrong.
- **Real sky** — the weather toggle (§9b). Its label doubles as the readout:
  "Real sky" when off, "Asking…" while pending, then the condition itself.
- A **lat/long field**, shown only while the real sky is on, carried over
  intact — a Kindle can refuse or silently fail to geolocate.

Everything else the panel held is either gone (rain intensity, custom
background, reset, the storage readout) or already somewhere better: the clock
toggles by tapping the clock, and the pet by tapping the pet.

Written to browser storage on change, applied immediately, no save button.

---

## 14. Storage schema

`localStorage` under a `rainlet:` prefix for small settings:

```
rainlet:settings     { mode, scene, pet, clock24,
                       weather, weatherCoords }
rainlet:custom-pet   "OOFF.....…"   // 280 chars: the pet you drew (§8)
```

Nothing uses IndexedDB any more. The music, the videos and finally the custom
backdrop all went, so boot deletes the old `rainlet-media` database outright —
a reader has little room to spare and there is no reason to leave dead blobs on
it forever.

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

Everything else is platform APIs — canvas, geolocation, matchMedia — each behind
a guard, because the Kindle browser has some of them and not others.

**The API floor is roughly 2020, and it is not enforced by the build.** Vite's
`es2015` target downlevels _syntax_; it does not know that a method exists. Two
bugs came from exactly that. `inset: 0` silently disabled the settings overlay,
and `replaceChildren()` threw — which wiped out the row of animals and, because
it threw mid-boot, everything scheduled after it. Neither showed up anywhere
except on the device. Prefer the oldest call that does the job: `removeChild`
in a loop, and the four long-hand offsets.

**A failure has to be readable on the device.** There is no console on a
Kindle, so a thrown error is a half-drawn page and nothing to report. Boot is
wrapped, and anything that escapes prints one plain line at the top of the
screen naming what threw. `?debug` adds the fuller readout — viewport, pixel
ratio, which modern CSS the engine admits to.

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
│   ├── widgets/       clock
│   ├── ui/            mascot, icons, idle, on-device debug readout
│   ├── settings/      store
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
   YouTube clips, for licensing and offline reasons. Later removed entirely:
   the Kindle has no audio path from the browser at all (§10).
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
    export was meant to put the animal onto the device as a file. All three
    were picked over anything needing an account or a server. The export was
    later removed — the device cannot save or open the file (§12).

11. **Sound and file export cut** — after testing on the real device: _"kindle
    can't play sounds at all... also pictures can't be saved as images on
    kindle."_ Both were true. With no sound and no file access, the only
    ambience channel left is **things that change while you are not looking**,
    so the replacement is a day/night cycle and idle pet behaviours rather than
    another feature the device cannot run.

Still to confirm during testing: the exact Kindle model and firmware, which
determines how much of modern JS the stock browser supports.
