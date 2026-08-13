// Pixel pets, drawn as character grids.
//
// A grid is far easier to read and edit than a list of rectangles, and the
// renderer turns it back into merged rects at draw time. Rows are padded to
// STAGE_W automatically, so nothing here depends on counting spaces exactly.
//
// Style follows the reference art the user supplied: a rounded seated animal
// with a full dark outline, big glossy eyes, blush cheeks, a tiny nose, and a
// heart and sparkle floating beside it. The outline matters for more than looks
// — it is what keeps the animals readable in Paper mode, where every fill
// collapses to white.
//
// The drawings were laid out as silhouettes with the outline derived from the
// edge, which is what gives them the reference's rounded corners rather than
// the boxy look of a hand-typed border.
//
// Frames differ from their base by a few pixels — a flicked tail, a blink — so
// each one is written as the base plus a short list of patches rather than as
// a whole second drawing.

export const STAGE_W = 40;
export const STAGE_H = 32;

// Ground sits at the bottom; everything above it is the pet's business.
export const GROUND_ROW = 29;

// Character -> CSS colour. Space and "." are transparent.
export const PALETTE = {
  O: "var(--pet-line)",
  F: "var(--pet-fur)",
  f: "var(--pet-fur-dark)",
  W: "var(--pet-white)",
  w: "var(--pet-white)", // eye glint: white in both modes
  E: "var(--pet-eye)",
  B: "var(--pet-blush)",
  P: "var(--pet-pink)",
  N: "var(--pet-nose)",
  Y: "var(--pet-gold)",
  S: "var(--pet-stem)",
  A: "var(--pet-accent)",
  a: "var(--pet-accent-dark)",
  R: "var(--pet-rain)",
  D: "var(--pet-puddle)",
  G: "var(--pet-ground)",
  s: "var(--pet-star)",
  u: "var(--pet-sun)",
  m: "var(--pet-moon)",
  c: "var(--pet-cloud)",
  H: "var(--pet-heart)",
};

/**
 * Applies [row, col, text] patches to a copy of a base grid.
 * A space inside a patch erases; use "." to leave a pixel alone.
 */
function frame(base, ...patches) {
  const rows = base.slice();
  for (const [r, c, text] of patches) {
    const row = (rows[r] || "").padEnd(STAGE_W, " ");
    let out = row.slice(0, c);
    for (let i = 0; i < text.length; i += 1) {
      out += text[i] === "." ? row[c + i] || " " : text[i];
    }
    rows[r] = out + row.slice(c + text.length);
  }
  return rows;
}

// Rows below are the finished art. Each animal is a round head narrowing at
// the neck into a seated body, with the same eyes and blush placement, so the
// five read as one family of drawings and differ in ears, props and colour.

const CAT = [
  "                                        ",
  "            OO            OO            ",
  "           OPPO          OPPO           ",
  "           OPPPOOOOOOOOOOPPPO           ",
  "          OPPPPFFFFFFFFFFPPPPO          ",
  "          OPPPPPFFFFFFFFPPPPPO          ",
  "           OFFFFFFFFFFFFFFFFO       Y   ",
  " HH HH    OFFFFFFFFWWFFFFFFFFO     YYY  ",
  " HHHHH   OFFFFFFFFWWWWFFFFFFFFO     Y   ",
  "  HHH    OFFFFFFFFWWWWFFFFFFFFO         ",
  "   H     OFFFEEEEFWWWWFEEEEFFFO         ",
  "         OFFEwwEEEWWWWEEEwwEFFO         ",
  "         OFFEwEEEEWWWWEEEEwEFFO         ",
  "         OFFEEEEEEWWWWEEEEEEFFO         ",
  "         OFFFEEEEWWWWWWEEEEFFFO         ",
  "          OFBBBWWWWNNWWWWBBBFO          ",
  "           OFBBBWWWPPWWWBBBFO           ",
  "            OWWWWWWWWWWWWWWO            ",
  "            OFWWWWWWWWWWWWFO            ",
  "            OWWWWWWWWWWWWWWO     OOOO   ",
  "           OFWWWWWWWWWWWWWWFO   OFFFFO  ",
  "          OFFWWWWWWWWWWWWWWFFO OFFFFFO  ",
  "          OFFWWWWWWWWWWWWWWFFO OFFFFO   ",
  "          OFFWWWWWWWWWWWWWWFFFOFFFOO    ",
  "          OFFWWWWWWWWWWWWWWFFFOOOO      ",
  "          OFWWWWWWWWWWWWWWWWFO          ",
  "          OWWWWWWWWWWWWWWWWWWO          ",
  "          OWWWWWOWWWWWWOWWWWWO          ",
  "           OOOOOOOOOOOOOOOOOO           ",
];

const CAT_FRAMES = [
  frame(CAT),
  frame(
    CAT,
    [17, 33, "OOOO"],
    [18, 32, "OFFFFO"],
    [19, 31, "OFFFFFO"],
    [20, 31, "OF"],
    [20, 36, "O "],
    [21, 30, "OF"],
    [21, 34, "OO  "],
    [22, 29, "FO"],
    [22, 32, "OO   "],
    [23, 29, "O      "],
    [24, 29, "O    "],
  ),
  frame(
    CAT,
    [10, 13, "FFFF"],
    [10, 23, "FFFF"],
    [11, 12, "FFFFFF"],
    [11, 22, "FFFFFF"],
    [12, 12, "FFFFFF"],
    [12, 22, "FFFFFF"],
    [13, 12, "FFFFFF"],
    [13, 22, "FFFFFF"],
  ),
  frame(
    CAT,
    [1, 12, "  "],
    [2, 11, "    "],
    [17, 33, "OOOO"],
    [18, 32, "OFFFFO"],
    [19, 31, "OFFFFFO"],
    [20, 31, "OF"],
    [20, 36, "O "],
    [21, 30, "OF"],
    [21, 34, "OO  "],
    [22, 29, "FO"],
    [22, 32, "OO   "],
    [23, 29, "O      "],
    [24, 29, "O    "],
  ),
];

const DOG = [
  "                                        ",
  "                                        ",
  "                                        ",
  "               OOOOOOOOOO               ",
  "              OFFFFWWFFFFO              ",
  "            OOFFFFWWWWFFFFOO            ",
  "           OFFFFFFWWWWFFFFFFO       Y   ",
  " HH HHOOOOOFFFFFFFWWWWFFFFFFFOOOOO YYY  ",
  " HHHHHffffFFFFFFFFFWWFFFFFFFFFffffO Y   ",
  "  HHHOffffFFFFFFFFFWWFFFFFFFFFffffO     ",
  "   H OffffFFFEEEEFFFFFFEEEEFFFffffO     ",
  "     OffffFFEwwEEEFFFFEEEwwEFFffffO     ",
  "     OffffFFEwEEEEFFFFEEEEwEFFffffO     ",
  "      OfffFFEEEEEEFFFFEEEEEEFFfffO      ",
  "      OfffBBBEEEEWWWWWWEEEEBBBfffO      ",
  "       OOOOBBBFWWWWNNWWWWFBBBOOOO       ",
  "           OFFWWWWWPPWWWWWFFO           ",
  "            OFWWWWWWWWWWWWFO            ",
  "            OFFWWWWWWWWWWFFO            ",
  "            OFFWWWWWWWWWWFFO     OOOO   ",
  "           OFFWWWWWWWWWWWWFFO   OFFFFO  ",
  "          OFFFWWWWWWWWWWWWFFFO OFFFFFO  ",
  "          OFFFFWWWWWWWWWWFFFFO OFFFFO   ",
  "          OFFFFFWWWWWWWWFFFFFFOFFFOO    ",
  "          OFFFFFFFFFFFFFFFFFFFOOOO      ",
  "          OFFFFFFFFFFFFFFFFFFO          ",
  "          OWWWWWWFFFFFFWWWWWWO          ",
  "          OWWOWWWFFFFFFWWWOWWO          ",
  "           OOOOOOOOOOOOOOOOOO           ",
];

const DOG_FRAMES = [
  frame(DOG),
  frame(
    DOG,
    [17, 33, "OOOO"],
    [18, 32, "OFFFFO"],
    [19, 31, "OFFFFFO"],
    [20, 31, "OF"],
    [20, 36, "O "],
    [21, 30, "OF"],
    [21, 34, "OO  "],
    [22, 29, "FO"],
    [22, 32, "OO   "],
    [23, 29, "O      "],
    [24, 29, "O    "],
  ),
  frame(
    DOG,
    [10, 13, "FFFF"],
    [10, 23, "FFFF"],
    [11, 12, "FFFFFF"],
    [11, 22, "FFFFFF"],
    [12, 12, "FFFFFF"],
    [12, 22, "FFFFFF"],
    [13, 12, "FFFFFF"],
    [13, 22, "FFFFFF"],
  ),
  frame(
    DOG,
    [6, 5, "OOOO"],
    [6, 31, "OOOO"],
    [7, 5, "ffff"],
    [7, 31, "ffff"],
    [8, 5, "f"],
    [8, 9, "F"],
    [8, 30, "F"],
    [8, 34, "fO"],
    [9, 5, "f"],
    [9, 9, "F"],
    [9, 30, "F"],
    [9, 34, "fO"],
    [10, 4, "Of"],
    [10, 9, "F"],
    [10, 30, "F"],
    [10, 34, "fO"],
    [11, 4, "Of"],
    [11, 9, "F"],
    [11, 30, "F"],
    [11, 34, "fO"],
    [12, 9, "F"],
    [12, 30, "F"],
    [13, 5, "Of"],
    [13, 9, "F"],
    [13, 30, "F"],
    [13, 33, "fO"],
    [14, 7, "OOO"],
    [14, 30, "OOO"],
    [15, 7, "   "],
    [15, 30, "   "],
    [17, 33, "OOOO"],
    [18, 32, "OFFFFO"],
    [19, 31, "OFFFFFO"],
    [20, 31, "OF"],
    [20, 36, "O "],
    [21, 30, "OF"],
    [21, 34, "OO  "],
    [22, 29, "FO"],
    [22, 32, "OO   "],
    [23, 29, "O      "],
    [24, 29, "O    "],
  ),
];

const BUNNY = [
  "             OOO        OOO             ",
  "            OPPO        OPPO            ",
  "            OPPO        OPPO            ",
  "            OPPFOOOOOOOOFPPO            ",
  "            OPPFFFFFFFFFFPPO            ",
  "            OFFFFFFFFFFFFFFO            ",
  "           OFFFFFFFFFFFFFFFFO       Y   ",
  " HH HH    OFFFFFFFFFFFFFFFFFFO     YYY  ",
  " HHHHH   OFFFFFFFFFFFFFFFFFFFFO     Y   ",
  "  HHH    OFFFFFFFFFFFFFFFFFFFFO         ",
  "   H     OFFFEEEEFFFFFFEEEEFFFO         ",
  "         OFFEwwEEEFFFFEEEwwEFFO         ",
  "         OFFEwEEEEFFFFEEEEwEFFO         ",
  "         OFFEEEEEEFFFFEEEEEEFFO         ",
  "         OBBBEEEEFFFFFFEEEEBBBO         ",
  "          OBBBFFFFFNNFFFFFBBBO          ",
  "           OFFFFFFFFFFFFFFFFO           ",
  "            OFFWWWWWWWWWWFFO            ",
  "            OFFWWWWWWWWWWFFO            ",
  "   AAA      OFWWWWWWWWWWWWFO            ",
  "  AAYAA    OFFWWWWWWWWWWWWFFO           ",
  "   AAA    OFFWWWWWWWWWWWWWWFFO          ",
  "     S    OFFWWWWWWWWWWWWWWFFFOOOO      ",
  "      S   OFFWWWWWWWWWWWWWWFFFFFFFO     ",
  "       S  OFFWWWWWWWWWWWWWWFFFFFFFO     ",
  "          OFWWWWWWWWWWWWWWWWFFOOOO      ",
  "          OWWWWWWWWWWWWWWWWWWO          ",
  "          OWWWWWOWWWWWWOWWWWWO          ",
  "           OOOOOOOOOOOOOOOOOO           ",
];

const BUNNY_FRAMES = [
  frame(BUNNY),
  frame(
    BUNNY,
    [0, 13, "   "],
    [0, 24, "   "],
    [1, 12, "    "],
    [1, 24, "    "],
    [2, 13, "OO"],
    [2, 25, "OO"],
  ),
  frame(
    BUNNY,
    [10, 13, "FFFF"],
    [10, 23, "FFFF"],
    [11, 12, "FFFFFF"],
    [11, 22, "FFFFFF"],
    [12, 12, "FFFFFF"],
    [12, 22, "FFFFFF"],
    [13, 12, "FFFFFF"],
    [13, 22, "FFFFFF"],
  ),
  frame(
    BUNNY,
    [14, 19, "NN"],
    [18, 3, "AAA"],
    [19, 2, "A"],
    [19, 4, "Y"],
    [19, 6, "A"],
    [20, 2, " "],
    [20, 4, "A"],
    [20, 6, " "],
    [21, 3, "  S"],
    [22, 5, " S"],
    [23, 6, " S"],
    [24, 7, " "],
  ),
];

const DUCK = [
  "                                        ",
  "                                        ",
  "                                        ",
  "                                        ",
  "                 OOOOOO                 ",
  "              OOOFFFFFFOOO              ",
  "            OOFFFFFFFFFFFFOO        Y   ",
  " HH HH     OFFFFFFFFFFFFFFFFO      YYY  ",
  " HHHHH    OFFFFFFFFFFFFFFFFFFO      Y   ",
  "  HHH    OFFFFFFFFFFFFFFFFFFFFO         ",
  "   H    OFFFEEEEFFFFFFFFEEEEFFFO        ",
  "        OFFEwwEEEFFFFFFEEEwwEFFO        ",
  "        OFFEwEEEEFFFFFFEEEEwEFFO        ",
  "        OFFEEEEEEFFFFFFEEEEEEFFO        ",
  "        OFFFEEEEFFFFFFFFEEEEFFFO        ",
  "        OBBBFFFFFFNNNNFFFFFFBBBO        ",
  "        OFBBBFFFFNNNNNNFFFFBBBFO        ",
  "        OFFFFFFFFFNNNNFFFFFFFFFO        ",
  "        OFFFFFWWWWWWWWWWWWFFFFFO        ",
  "        OFFFFWWWWWWWWWWWWWWFFFFO        ",
  "         OFFFWWWWWWWWWWWWWWFFFO         ",
  "          OFFFWWWWWWWWWWWWFFFO          ",
  "           OFFFWWWWWWWWWWFFFO           ",
  "            OFFFWWWWWWWWFFFO            ",
  "            ONNNNN    NNNNNO            ",
  "           ONNNNNNO  ONNNNNNO           ",
  "                                        ",
  "                                        ",
  "                                        ",
];

const DUCK_FRAMES = [
  frame(DUCK),
  frame(DUCK, [17, 17, "N"], [17, 22, "N"], [18, 18, "NNNN"]),
  frame(
    DUCK,
    [10, 13, "FFF"],
    [10, 24, "FFF"],
    [11, 12, "FFFFF"],
    [11, 23, "FFFFF"],
    [12, 12, "FFFFF"],
    [12, 23, "FFFFF"],
    [13, 12, "FFFFF"],
    [13, 23, "FFFFF"],
  ),
  frame(
    DUCK,
    [23, 13, "O"],
    [23, 26, "O"],
    [24, 12, "  O"],
    [24, 18, "NNNN"],
    [24, 25, "O  "],
    [25, 11, "  O"],
    [25, 18, "NNNN"],
    [25, 26, "O  "],
  ),
];

const FROG = [
  "                                        ",
  "                                        ",
  "                  PPPP                  ",
  "                OPPYYPPO                ",
  "               OPPPYYPPPO               ",
  "               OPPPPPPPPO               ",
  "                 OPPPPO             Y   ",
  " HH HH       OOOOFFFFFFOOOO        YYY  ",
  " HHHHH     OOFFFFFFFFFFFFFFOO       Y   ",
  "  HHH    OOFFFFFFFFFFFFFFFFFFOO         ",
  "   H    OFFFFFFFFFFFFFFFFFFFFFFO        ",
  "       OFFFEEEEEFFFFFFFFEEEEEFFFO       ",
  "      OFFFEwwEEEEFFFFFFEEEEwwEFFFO      ",
  "      OFFFEwEEEEEFFFFFFEEEEEwEFFFO      ",
  "     OFFFFEEEEEEEFFFFFFEEEEEEEFFFFO     ",
  "     OFFFFFEEEEEFFFFFFFFEEEEEFFFFFO     ",
  "     OFBBBFFFFFFFFFFFFFFFFFFFFBBBFO     ",
  "     OFFBBBFFFFFOOFFFFOOFFFFFBBBFFO     ",
  "     OFFFFFFFFFFFOOOOOOFFFFFFFFFFFO     ",
  "     OFFFFFFFFFFFFFFFFFFFFFFFFFFFFO     ",
  "     OFFFFFFFFFFFFFFFFFFFFFFFFFFFFO     ",
  "     OFFFFFFFFFFFFFFFFFFFFFFFFFFFFO     ",
  "     OFFFFFFFFFFFFFFFFFFFFFFFFFFFFO     ",
  "      OFFFFFFFFFFFFFFFFFFFFFFFFFFO      ",
  "      OFFFFFFFFFFFFFFFFFFFFFFFFFFO      ",
  "       OFFFFFFFFFFFFFFFFFFFFFFFFO       ",
  "        OFFFOOFFFFFFFFFFFFOOFFFO        ",
  "         OOOOOOOOOOOOOOOOOOOOOO         ",
  "                                        ",
];

const FROG_FRAMES = [
  frame(FROG),
  frame(FROG, [18, 16, "O"], [18, 23, "O"], [19, 17, "OOOOOO"]),
  frame(
    FROG,
    [11, 11, "FFFFF"],
    [11, 24, "FFFFF"],
    [12, 10, "FFFFFFF"],
    [12, 23, "FFFFFFF"],
    [13, 10, "FFFFFFF"],
    [13, 23, "FFFFFFF"],
    [14, 10, "FFFFFFF"],
    [14, 23, "FFFFFFF"],
  ),
  frame(
    FROG,
    [2, 18, "    "],
    [3, 16, "  "],
    [3, 19, "PP"],
    [3, 22, "  "],
    [4, 15, " O"],
    [4, 23, "O "],
    [5, 19, "YY"],
    [6, 15, "OPP"],
    [6, 22, "PPO"],
    [6, 36, " "],
    [7, 15, "FF"],
    [7, 23, "FF"],
  ),
];

export const PETS = {
  cat: {
    label: "Cat",
    emoji: "🐱",
    hint: "A tuxedo cat, unbothered, slightly damp.",
    frames: CAT_FRAMES,
    colors: {
      "--pet-line": "#241f23",
      "--pet-fur": "#2f2a2e",
      "--pet-pink": "#f3a7b4",
    },
  },
  dog: {
    label: "Dog",
    emoji: "🐶",
    hint: "Delighted by the rain. Shakes it off anyway.",
    frames: DOG_FRAMES,
    colors: {
      "--pet-line": "#6b4326",
      "--pet-fur": "#e8a85c",
      "--pet-fur-dark": "#c6813c",
      "--pet-white": "#fbefd8",
    },
  },
  duck: {
    label: "Duck",
    emoji: "🦆",
    hint: "Best day of the week, as far as she is concerned.",
    frames: DUCK_FRAMES,
    colors: {
      "--pet-line": "#7a5a1e",
      "--pet-fur": "#f6d96b",
      "--pet-nose": "#f0913c",
    },
  },
  bunny: {
    label: "Bunny",
    emoji: "🐰",
    hint: "Brought a flower. Mostly staying dry.",
    frames: BUNNY_FRAMES,
    colors: {
      "--pet-line": "#8a6a55",
      "--pet-fur": "#fbf3ea",
      "--pet-accent": "#f2a0a8",
    },
  },
  frog: {
    label: "Frog",
    emoji: "🐸",
    hint: "A round green friend in his element.",
    frames: FROG_FRAMES,
    colors: {
      "--pet-line": "#1f1f1f",
      "--pet-fur": "#a8d08a",
      "--pet-fur-dark": "#86b36a",
      "--pet-pink": "#f2a0c0",
    },
  },
};

export const PET_ORDER = ["cat", "dog", "duck", "bunny", "frog"];

// Every colour a pet may override, so switching animals cannot leave a stray
// var behind from the one before it.
export const PET_COLOR_KEYS = [
  ...new Set(Object.values(PETS).flatMap((pet) => Object.keys(pet.colors))),
];

// Two hearts, popped when the pet is petted. Kept out of the pet grids so
// every animal gets them from the same place.
export const HEARTS = [
  [2, 32, "H.H"],
  [3, 32, "HHH"],
  [4, 33, "H"],
  [1, 6, "H.H"],
  [2, 6, "HHH"],
  [3, 7, "H"],
];
