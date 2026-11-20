// Posh Passport brand marks. Plain SVG strings so they can be used by React
// components and by the icon/splash render script (scripts/brand.mjs).
// Drawn after the Posh Properties Ltd towers logo: red towers rising to the
// centre, green towers stepping down, joined on one base line.

export const BRAND = {
  red: '#ED1F24',
  green: '#136734',
  greenDeep: '#0B4A24',
  greenNight: '#062E17',
  ink: '#231F20',
  cream: '#FBF8F2',
  gold: '#C9A227',
}

/** Towers outline in a 100x100 box. stroke colours configurable. */
export function towers(opts: { red?: string; green?: string; sw?: number; base?: boolean } = {}) {
  const red = opts.red ?? BRAND.red
  const green = opts.green ?? BRAND.green
  const sw = opts.sw ?? 3.2
  const base = opts.base ?? true
  const j = 'stroke-linejoin="miter" stroke-miterlimit="1.5" stroke-linecap="square" fill="none"'
  return `
  <g ${j} stroke-width="${sw}">
    <path stroke="${red}" d="M14 78 V62 L22 57 V78" />
    <path stroke="${red}" d="M28 78 V46 L37 40 V78" />
    <path stroke="${red}" d="M43 78 V26 L50 14 V78" />
    <path stroke="${green}" d="M50 14 L57 26 V78" />
    <path stroke="${green}" d="M63 78 V36 L71 41 V78" />
    <path stroke="${green}" d="M77 78 V52 L85 57 V78" />
    ${base ? `<path stroke="${red}" d="M6 78 H50" /><path stroke="${green}" d="M50 78 H94" />` : ''}
  </g>`
}

/** Option A – Heritage: the towers + serif POSH wordmark (stacked). 300x330 */
export function logoHeritage(dark = false) {
  const ink = dark ? '#FFFFFF' : BRAND.ink
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 330">
  <g transform="translate(40 0) scale(2.2)">${towers({ sw: 2.6 })}</g>
  <text x="150" y="262" text-anchor="middle" font-family="'DM Serif Display', Georgia, serif" font-size="92" fill="${ink}" letter-spacing="2">POSH</text>
  <rect x="34" y="276" width="116" height="5" fill="${BRAND.red}"/><rect x="150" y="276" width="116" height="5" fill="${BRAND.green}"/>
  <text x="150" y="314" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="25" fill="${ink}" letter-spacing="3">PROPERTIES LTD</text>
</svg>`
}

/** Option B – Passport: app-icon tile, towers in white on deep green, red base + NFC arcs. */
export function iconPassport(size = 1024, opts: { round?: boolean; bleed?: boolean } = {}) {
  const r = opts.bleed ? 0 : opts.round ? 512 : 230
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A8043"/><stop offset="1" stop-color="${BRAND.greenNight}"/></linearGradient></defs>
  <rect width="1024" height="1024" rx="${r}" fill="url(#g)"/>
  <g transform="translate(212 170) scale(6)">${towers({ red: '#FF4A4F', green: '#FFFFFF', sw: 3.4 })}</g>
  <g fill="none" stroke="${BRAND.gold}" stroke-width="22" stroke-linecap="round">
    <path d="M790 196 a60 60 0 0 1 0 90" /><path d="M836 160 a110 110 0 0 1 0 162" />
  </g>
  <text x="512" y="900" text-anchor="middle" font-family="'DM Serif Display', Georgia, serif" font-size="150" fill="#FFFFFF" letter-spacing="6">POSH</text>
</svg>`
}

/** Option C – Seal: round verification seal (plaques, verify page, loader). */
export function sealSvg(size = 512, dark = false) {
  const bg = dark ? BRAND.greenNight : '#FFFFFF'
  const ink = dark ? '#FFFFFF' : BRAND.ink
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs><path id="ring" d="M256 256 m-196 0 a196 196 0 1 1 392 0 a196 196 0 1 1 -392 0"/></defs>
  <circle cx="256" cy="256" r="250" fill="${bg}"/>
  <circle cx="256" cy="256" r="240" fill="none" stroke="${BRAND.green}" stroke-width="10"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="${BRAND.red}" stroke-width="4"/>
  <text font-family="Inter, Arial, sans-serif" font-weight="700" font-size="34" letter-spacing="7" fill="${ink}"><textPath href="#ring" startOffset="0" textLength="1215" lengthAdjust="spacing">POSH PROPERTIES · VERIFIED · POSH PASSPORT · </textPath></text>
  <g transform="translate(156 128) scale(2)">${towers({ sw: 3.2 })}</g>
  <text x="256" y="330" text-anchor="middle" font-family="'DM Serif Display', Georgia, serif" font-size="58" fill="${ink}">POSH</text>
</svg>`
}

/** Horizontal lock-up for headers: towers + POSH / PASSPORT. 360x80 */
export function logoHorizontal(dark = false, sub = 'PASSPORT') {
  const ink = dark ? '#FFFFFF' : BRAND.ink
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 80">
  <g transform="translate(0 0) scale(0.8)">${towers({ sw: 3.4, red: dark ? '#FF4A4F' : BRAND.red, green: dark ? '#4ADE80' : BRAND.green })}</g>
  <text x="88" y="50" font-family="'DM Serif Display', Georgia, serif" font-size="46" fill="${ink}" letter-spacing="1">POSH</text>
  <text x="90" y="72" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="14" fill="${dark ? '#FBBF24' : BRAND.green}" letter-spacing="5.5">${sub}</text>
</svg>`
}
