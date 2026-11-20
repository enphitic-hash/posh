import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
const root = execSync('npm root -g').toString().trim()
export const { chromium } = createRequire(root + '/')('playwright')
