import { readFileSync } from 'node:fs'
const f = (p) => readFileSync(new URL('../node_modules/@fontsource/' + p, import.meta.url)).toString('base64')
export const fontCss = `
@font-face{font-family:'DM Serif Display';src:url(data:font/woff2;base64,${f('dm-serif-display/files/dm-serif-display-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:Inter;font-weight:400;src:url(data:font/woff2;base64,${f('inter/files/inter-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:Inter;font-weight:600;src:url(data:font/woff2;base64,${f('inter/files/inter-latin-600-normal.woff2')}) format('woff2')}
@font-face{font-family:Inter;font-weight:700;src:url(data:font/woff2;base64,${f('inter/files/inter-latin-700-normal.woff2')}) format('woff2')}
@font-face{font-family:Inter;font-weight:800;src:url(data:font/woff2;base64,${f('inter/files/inter-latin-800-normal.woff2')}) format('woff2')}`
