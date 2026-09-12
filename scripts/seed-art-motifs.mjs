export const MOTIFS = {
  vase: (c) => `
    <path d="M470 330 q-30 130 40 250 q90 90 180 0 q70 -120 40 -250 q-130 40 -260 0 z" fill="${c.ink}" opacity="0.82"/>
    <path d="M470 330 q130 -70 260 0" fill="none" stroke="${c.ink}" stroke-width="18" stroke-linecap="round"/>
    <path d="M520 430 q80 30 160 0" fill="none" stroke="${c.from}" stroke-width="10" opacity="0.55"/>
    <path d="M515 505 q85 32 170 0" fill="none" stroke="${c.from}" stroke-width="10" opacity="0.4"/>`,

  plates: (c) => `
    <ellipse cx="600" cy="560" rx="210" ry="52" fill="${c.ink}" opacity="0.85"/>
    <ellipse cx="600" cy="545" rx="210" ry="52" fill="${c.accent}"/>
    <ellipse cx="600" cy="545" rx="150" ry="34" fill="${c.from}" opacity="0.7"/>
    <ellipse cx="600" cy="450" rx="175" ry="44" fill="${c.ink}" opacity="0.8"/>
    <ellipse cx="600" cy="440" rx="175" ry="44" fill="${c.accent}" opacity="0.95"/>
    <ellipse cx="600" cy="440" rx="120" ry="27" fill="${c.from}" opacity="0.7"/>`,

  bowl: (c) => `
    <path d="M400 440 q200 250 400 0 z" fill="${c.ink}" opacity="0.85"/>
    <ellipse cx="600" cy="440" rx="200" ry="48" fill="${c.accent}"/>
    <ellipse cx="600" cy="440" rx="146" ry="33" fill="${c.from}" opacity="0.75"/>`,

  mug: (c) => `
    <path d="M470 340 h240 v210 q0 70 -120 70 q-120 0 -120 -70 z" fill="${c.ink}" opacity="0.85"/>
    <path d="M710 390 q90 0 90 70 q0 70 -90 70" fill="none" stroke="${c.ink}" stroke-width="26" stroke-linecap="round" opacity="0.85"/>
    <path d="M500 420 h180" stroke="${c.from}" stroke-width="12" opacity="0.5" stroke-linecap="round"/>
    <path d="M500 470 h180" stroke="${c.from}" stroke-width="12" opacity="0.35" stroke-linecap="round"/>
    <ellipse cx="590" cy="340" rx="120" ry="26" fill="${c.accent}"/>`,

  cups: (c) => `
    <path d="M400 400 h180 v110 q0 55 -90 55 q-90 0 -90 -55 z" fill="${c.ink}" opacity="0.85"/>
    <ellipse cx="490" cy="400" rx="90" ry="20" fill="${c.accent}"/>
    <path d="M660 430 h180 v110 q0 55 -90 55 q-90 0 -90 -55 z" fill="${c.ink}" opacity="0.7"/>
    <ellipse cx="750" cy="430" rx="90" ry="20" fill="${c.accent}" opacity="0.85"/>
    <path d="M380 610 h220" stroke="${c.ink}" stroke-width="12" opacity="0.4" stroke-linecap="round"/>`,

  teapot: (c) => `
    <path d="M440 420 q0 190 170 190 q170 0 170 -190 z" fill="${c.ink}" opacity="0.85"/>
    <ellipse cx="610" cy="420" rx="170" ry="40" fill="${c.accent}"/>
    <path d="M780 450 q80 20 70 90" fill="none" stroke="${c.ink}" stroke-width="22" stroke-linecap="round"/>
    <path d="M440 450 q-80 10 -90 -50" fill="none" stroke="${c.ink}" stroke-width="22" stroke-linecap="round"/>
    <circle cx="610" cy="360" r="26" fill="${c.ink}" opacity="0.9"/>
    <path d="M540 355 h140" stroke="${c.ink}" stroke-width="14" stroke-linecap="round" opacity="0.6"/>`,

  bottle: (c) => `
    <path d="M555 250 h90 v110 q80 60 80 160 v130 q0 40 -40 40 h-170 q-40 0 -40 -40 v-130 q0 -100 80 -160 z" fill="${c.ink}" opacity="0.85"/>
    <rect x="548" y="215" width="104" height="45" rx="14" fill="${c.accent}"/>
    <rect x="510" y="470" width="180" height="90" rx="10" fill="${c.from}" opacity="0.55"/>`,

  tiles: (c) => `
    ${[0, 1, 2]
      .flatMap((row) =>
        [0, 1, 2].map((col) => {
          const x = 400 + col * 140;
          const y = 280 + row * 140;
          const shade = (row + col) % 2 ? c.accent : c.ink;
          return `<rect x="${x}" y="${y}" width="118" height="118" rx="12" fill="${shade}" opacity="${
            (row + col) % 2 ? 0.75 : 0.85
          }"/>`;
        })
      )
      .join('')}`,

  planter: (c) => `
    <path d="M490 470 h220 l-26 190 q-4 30 -34 30 h-100 q-30 0 -34 -30 z" fill="${c.ink}" opacity="0.88"/>
    <rect x="476" y="440" width="248" height="42" rx="12" fill="${c.accent}"/>
    <path d="M600 440 q-10 -120 -90 -160 q60 100 60 160" fill="${c.accent}" opacity="0.9"/>
    <path d="M600 440 q10 -140 100 -180 q-70 110 -70 180" fill="${c.ink}" opacity="0.7"/>`,

  lamp: (c) => `
    <path d="M470 400 h260 l-60 -120 h-140 z" fill="${c.ink}" opacity="0.85"/>
    <path d="M600 400 v190" stroke="${c.ink}" stroke-width="16"/>
    <path d="M500 640 q100 -70 200 0 z" fill="${c.accent}" opacity="0.85"/>
    <circle cx="600" cy="255" r="20" fill="${c.accent}" opacity="0.8"/>`,

  cushion: (c) => `
    <path d="M420 300 q180 -34 360 0 q34 180 0 360 q-180 34 -360 0 q-34 -180 0 -360 z" fill="${c.ink}" opacity="0.85"/>
    <path d="M470 350 q130 -22 260 0" fill="none" stroke="${c.from}" stroke-width="12" opacity="0.5"/>
    <path d="M470 610 q130 22 260 0" fill="none" stroke="${c.from}" stroke-width="12" opacity="0.5"/>
    <circle cx="600" cy="480" r="52" fill="${c.accent}" opacity="0.8"/>`,

  runner: (c) => `
    <path d="M330 340 h540 v40 h-540 z" fill="${c.accent}"/>
    <path d="M360 380 h480 v220 h-480 z" fill="${c.ink}" opacity="0.85"/>
    ${[0, 1, 2, 3]
      .map((i) => `<path d="M390 ${420 + i * 46} h420" stroke="${c.from}" stroke-width="10" opacity="${0.5 - i * 0.08}" stroke-linecap="round"/>`)
      .join('')}
    <path d="M360 600 l30 40 l30 -40 l30 40 l30 -40 l30 40 l30 -40 l30 40 l30 -40 l30 40 l30 -40 l30 40 l30 -40 l30 40 l30 -40" fill="none" stroke="${c.ink}" stroke-width="9" opacity="0.6"/>`,

  books: (c) => `
    <rect x="420" y="300" width="70" height="330" rx="8" fill="${c.ink}" opacity="0.88"/>
    <rect x="500" y="330" width="56" height="300" rx="8" fill="${c.accent}"/>
    <rect x="566" y="310" width="64" height="320" rx="8" fill="${c.ink}" opacity="0.7"/>
    <path d="M660 630 l150 -290 l58 28 l-150 290 z" fill="${c.accent}" opacity="0.85"/>
    <path d="M400 630 h480" stroke="${c.ink}" stroke-width="16" stroke-linecap="round"/>`,

  necklace: (c) => `
    <path d="M380 280 q220 300 440 0" fill="none" stroke="${c.ink}" stroke-width="14" stroke-linecap="round" opacity="0.85"/>
    <path d="M600 505 l46 78 l-46 78 l-46 -78 z" fill="${c.accent}"/>
    <circle cx="600" cy="505" r="18" fill="${c.ink}" opacity="0.9"/>
    ${[0.25, 0.5, 0.75]
      .map((t) => `<circle cx="${380 + 440 * t}" cy="${280 + 300 * Math.sin(Math.PI * t)}" r="10" fill="${c.ink}" opacity="0.5"/>`)
      .join('')}`,

  hoops: (c) => `
    <circle cx="470" cy="470" r="130" fill="none" stroke="${c.ink}" stroke-width="26" opacity="0.85"/>
    <circle cx="740" cy="470" r="130" fill="none" stroke="${c.accent}" stroke-width="26" opacity="0.9"/>
    <circle cx="470" cy="320" r="16" fill="${c.ink}" opacity="0.8"/>
    <circle cx="740" cy="320" r="16" fill="${c.ink}" opacity="0.8"/>`,

  ring: (c) => `
    <circle cx="600" cy="500" r="145" fill="none" stroke="${c.ink}" stroke-width="34" opacity="0.85"/>
    <circle cx="600" cy="500" r="145" fill="none" stroke="${c.accent}" stroke-width="10" opacity="0.7"/>
    <path d="M600 270 l52 78 l-52 72 l-52 -72 z" fill="${c.accent}"/>`,

  stackrings: (c) => `
    <ellipse cx="600" cy="380" rx="150" ry="42" fill="none" stroke="${c.ink}" stroke-width="20" opacity="0.85"/>
    <ellipse cx="600" cy="470" rx="150" ry="42" fill="none" stroke="${c.accent}" stroke-width="20" opacity="0.9"/>
    <ellipse cx="600" cy="560" rx="150" ry="42" fill="none" stroke="${c.ink}" stroke-width="20" opacity="0.6"/>`,

  cuff: (c) => `
    <path d="M420 470 a180 180 0 1 1 360 0" fill="none" stroke="${c.ink}" stroke-width="46" stroke-linecap="round" opacity="0.85"/>
    <path d="M420 470 a180 180 0 1 1 360 0" fill="none" stroke="${c.accent}" stroke-width="14" opacity="0.75"/>
    <circle cx="420" cy="480" r="26" fill="${c.ink}" opacity="0.9"/>
    <circle cx="780" cy="480" r="26" fill="${c.ink}" opacity="0.9"/>`,

  scarf: (c) => `
    <path d="M360 380 q120 -90 240 0 q120 90 240 0" fill="none" stroke="${c.ink}" stroke-width="30" stroke-linecap="round" opacity="0.85"/>
    <path d="M360 470 q120 -90 240 0 q120 90 240 0" fill="none" stroke="${c.accent}" stroke-width="24" stroke-linecap="round" opacity="0.85"/>
    <path d="M360 560 q120 -90 240 0 q120 90 240 0" fill="none" stroke="${c.ink}" stroke-width="16" stroke-linecap="round" opacity="0.45"/>
    ${[430, 490, 550, 610, 670, 730]
      .map((x) => `<path d="M${x} 640 v50" stroke="${c.ink}" stroke-width="7" opacity="0.4" stroke-linecap="round"/>`)
      .join('')}`,

  garment: (c) => `
    <path d="M470 300 l130 -40 l130 40 l90 70 l-56 70 l-44 -32 v250 h-240 v-250 l-44 32 l-56 -70 z" fill="${c.ink}" opacity="0.85"/>
    <path d="M600 260 v398" stroke="${c.from}" stroke-width="12" opacity="0.55"/>
    <path d="M540 300 q60 60 120 0" fill="none" stroke="${c.accent}" stroke-width="14"/>`,

  tote: (c) => `
    <rect x="440" y="380" width="320" height="290" rx="26" fill="${c.ink}" opacity="0.85"/>
    <path d="M520 380 v-40 q80 -70 160 0 v40" fill="none" stroke="${c.ink}" stroke-width="20" stroke-linecap="round"/>
    <path d="M500 470 h200" stroke="${c.from}" stroke-width="14" opacity="0.5" stroke-linecap="round"/>
    <path d="M500 530 h140" stroke="${c.from}" stroke-width="14" opacity="0.35" stroke-linecap="round"/>`,

  pouch: (c) => `
    <path d="M420 400 h360 q28 0 24 28 l-26 210 q-4 32 -36 32 h-284 q-32 0 -36 -32 l-26 -210 q-4 -28 24 -28 z" fill="${c.ink}" opacity="0.85"/>
    <rect x="410" y="372" width="380" height="42" rx="16" fill="${c.accent}"/>
    <circle cx="600" cy="393" r="13" fill="${c.from}"/>
    ${[500, 600, 700].map((x) => `<circle cx="${x}" cy="530" r="20" fill="${c.accent}" opacity="0.55"/>`).join('')}`,

  board: (c) => `
    <path d="M370 350 h380 q70 0 70 110 t-70 110 h-380 q-26 0 -26 -110 t26 -110 z" fill="${c.ink}" opacity="0.85"/>
    <circle cx="770" cy="405" r="20" fill="${c.from}" opacity="0.8"/>
    ${[400, 440, 480]
      .map((y) => `<path d="M400 ${y} q160 14 320 0" fill="none" stroke="${c.from}" stroke-width="8" opacity="0.4"/>`)
      .join('')}
    <path d="M400 640 h400" stroke="${c.accent}" stroke-width="14" opacity="0.5" stroke-linecap="round"/>`,

  rings: (c) => `
    <g fill="none" stroke-linecap="round">
      ${[0, 1, 2, 3, 4]
        .map((i) => `<circle cx="600" cy="460" r="${60 + i * 42}" stroke="${i % 2 ? c.accent : c.ink}" stroke-width="${i % 2 ? 10 : 16}" opacity="${0.85 - i * 0.1}"/>`)
        .join('')}
    </g>
    <path d="M600 460 l170 -120" stroke="${c.ink}" stroke-width="12" opacity="0.5" stroke-linecap="round"/>`,

  scoop: (c) => `
    <path d="M420 430 q0 -110 110 -110 q110 0 110 110 q0 110 -110 110 q-110 0 -110 -110 z" fill="${c.ink}" opacity="0.85"/>
    <ellipse cx="530" cy="410" rx="82" ry="60" fill="${c.accent}" opacity="0.8"/>
    <path d="M630 470 l180 190" stroke="${c.ink}" stroke-width="34" stroke-linecap="round" opacity="0.85"/>`,

  cards: (c) => `
    <rect x="380" y="330" width="300" height="220" rx="14" fill="${c.ink}" opacity="0.6" transform="rotate(-8 530 440)"/>
    <rect x="440" y="360" width="300" height="220" rx="14" fill="${c.accent}" transform="rotate(4 590 470)"/>
    <rect x="500" y="390" width="300" height="220" rx="14" fill="${c.ink}" opacity="0.88"/>
    <path d="M540 470 h220" stroke="${c.from}" stroke-width="12" opacity="0.6" stroke-linecap="round"/>
    <path d="M540 520 h140" stroke="${c.from}" stroke-width="12" opacity="0.4" stroke-linecap="round"/>`,

  sketchbook: (c) => `
    <path d="M440 300 h320 q30 0 30 30 v330 q0 30 -30 30 h-320 z" fill="${c.ink}" opacity="0.88"/>
    <path d="M440 300 v390" stroke="${c.accent}" stroke-width="28"/>
    ${[0, 1, 2, 3, 4, 5]
      .map((i) => `<circle cx="440" cy="${340 + i * 62}" r="11" fill="${c.from}" opacity="0.85"/>`)
      .join('')}
    <path d="M540 430 q70 -70 150 0" fill="none" stroke="${c.from}" stroke-width="12" opacity="0.55" stroke-linecap="round"/>`,

  print: (c) => `
    <rect x="420" y="270" width="360" height="400" rx="10" fill="none" stroke="${c.ink}" stroke-width="22" opacity="0.85"/>
    <rect x="462" y="312" width="276" height="316" fill="${c.accent}" opacity="0.5"/>
    <path d="M462 560 q70 -110 138 -40 q68 70 138 -30 v138 h-276 z" fill="${c.ink}" opacity="0.8"/>
    <circle cx="540" cy="390" r="34" fill="${c.ink}" opacity="0.6"/>`,

  brush: (c) => `
    <path d="M370 620 q90 -300 230 -300 q140 0 230 300" fill="none" stroke="${c.ink}" stroke-width="34" stroke-linecap="round" opacity="0.85"/>
    <circle cx="470" cy="330" r="42" fill="${c.accent}" opacity="0.85"/>
    <path d="M700 640 q60 -140 120 -200" fill="none" stroke="${c.accent}" stroke-width="18" stroke-linecap="round" opacity="0.7"/>`,

  drawing: (c) => `
    <path d="M600 640 q-30 -170 -120 -240 q100 30 120 150 q20 -140 130 -180 q-95 90 -110 270 z" fill="${c.ink}" opacity="0.85"/>
    <path d="M600 660 v-40" stroke="${c.ink}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="480" cy="400" r="26" fill="${c.accent}" opacity="0.8"/>
    <circle cx="730" cy="370" r="20" fill="${c.accent}" opacity="0.6"/>`,

  gift: (c) => `
    <rect x="440" y="400" width="320" height="250" rx="20" fill="${c.ink}" opacity="0.85"/>
    <path d="M600 400 v250" stroke="${c.from}" stroke-width="26" opacity="0.75"/>
    <path d="M440 490 h320" stroke="${c.from}" stroke-width="26" opacity="0.75"/>
    <path d="M600 400 q-90 -90 -30 -110 q60 -20 30 110 z" fill="${c.accent}" opacity="0.9"/>
    <path d="M600 400 q90 -90 30 -110 q-60 -20 -30 110 z" fill="${c.accent}" opacity="0.9"/>`,

  weave: (c) => `
    <g opacity="0.85">
      ${[0, 1, 2, 3, 4, 5, 6]
        .map((i) => {
          const y = 250 + i * 58;
          return `<path d="M400 ${y} q100 -34 200 0 q100 34 200 0" fill="none" stroke="${i % 2 ? c.accent : c.ink}" stroke-width="${i % 2 ? 10 : 16}" stroke-linecap="round"/>`;
        })
        .join('')}
    </g>`,
};

const NAME_RULES = [
  [/vase/i, 'vase'],
  [/plate|platter|dinner/i, 'plates'],
  [/tea\s*set|teapot/i, 'teapot'],
  [/espresso|cup/i, 'cups'],
  [/mug/i, 'mug'],
  [/pourer|bottle|oil/i, 'bottle'],
  [/bowl/i, 'bowl'],
  [/tile/i, 'tiles'],
  [/planter|plant/i, 'planter'],
  [/lamp|light(?!.*print)/i, 'lamp'],
  [/cushion|pillow/i, 'cushion'],
  [/runner|tablecloth/i, 'runner'],
  [/bookend|bookshelf/i, 'books'],
  [/necklace|pendant/i, 'necklace'],
  [/hoop|earring/i, 'hoops'],
  [/stacking\s*ring/i, 'stackrings'],
  [/ring/i, 'ring'],
  [/cuff|bangle|bracelet/i, 'cuff'],
  [/scarf|shawl/i, 'scarf'],
  [/jacket|kimono|shirt|dress|coat/i, 'garment'],
  [/tote/i, 'tote'],
  [/pouch|purse|clutch|wallet/i, 'pouch'],
  [/board|tray/i, 'board'],
  [/scoop|spoon|ladle/i, 'scoop'],
  [/card|letterpress|stationery/i, 'cards'],
  [/sketchbook|notebook|journal|bound/i, 'sketchbook'],
  [/linocut|print/i, 'print'],
  [/gouache|painting|study|canvas/i, 'brush'],
  [/drawing|botanical|ink/i, 'drawing'],
  [/turned|cherry|walnut|oak|timber|wood/i, 'rings'],
  [/gift|hamper/i, 'gift'],
];

const CATEGORY_FALLBACK = {
  pottery: 'vase',
  ceramics: 'bowl',
  jewelry: 'ring',
  clothing: 'garment',
  bags: 'tote',
  accessories: 'scarf',
  art: 'brush',
  woodwork: 'rings',
  'home-decor': 'lamp',
  'handmade-gifts': 'gift',
};

export function motifFor(name = '', category = '') {
  for (const [pattern, motif] of NAME_RULES) {
    if (pattern.test(name)) return motif;
  }
  return CATEGORY_FALLBACK[category] || 'vase';
}
