# Posh Passport

A working demo for **Posh Properties Ltd** (Bukoto, Kampala): one system for every Posh business. Sales, construction, property management, valuation and mortgages share one record per property, its *Posh Passport*.

Built by Victor Bee Technologies, Mbarara. All names, units and money are sample data.

## What's inside

| Part | Where | What it does |
|---|---|---|
| **Posh app** | `#/app` (web, installable) and the Android APK | Tenant: pay rent with a Posh card tap, MTN MoMo, Airtel Money, Visa/Mastercard, bank or Posh Wallet, split payments, PDF and WhatsApp receipts, repairs with photos, lease, visitor gate pass. Buyer: AI home matching, Posh Verified filter, WhatsApp viewing booking, Posh Home Finance. Building client: progress, site photos, stage payments from abroad. Landlord: statement, URA tax, PDF. Staff: site manager (crew clock-in, wages by MoMo, materials, issues, updates to client) and caretaker round. |
| **Posh Office** | `#/office` | Dashboard, rent and payments (live), Posh AI late-payer list with friendly reminders, tenants, landlords and statements, repairs board (assign plumber, tenant told on WhatsApp), NFC cards and gates (issue, write, register chip, block), Posh Passports with story timeline, construction sites, sales pipeline, viewings, listings, valuations, home finance, message log. |
| **Verify page** | `#/p/PP-KLA-0412` | What anyone sees after tapping a property plaque. |
| **Card page** | `#/c/<card>` | What an iPhone opens after tapping a Posh card; pay rent from there. |

Every screen has **Settings** with light, dark or phone theme, 4 text sizes and reduce motion.

### Demo logins

| Who | How |
|---|---|
| Tenant Nakato Sarah (Naguru Heights B4) | Phone `+256 772 300 412`, PIN `1234` |
| MoMo / Airtel approval | PIN `1234` |
| Card payments | `4111 1111 1111 1111` |
| Posh Office: Hajji Issa Bukenya | PIN `2024` (other staff PINs are shown on the login screen) |

## Live data

Phones and Posh Office share one Supabase table (`public.posh_records`) with realtime updates, so a rent payment on a phone appears on the Office screen at once. If the server can't be reached the app keeps working on that device. **Settings → Reset demo data** (Office) puts everything back to the starting sample.

Config is in `src/config.ts` (or `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_PUBLIC_URL`).

## NFC cards (NXP NTAG213)

Each card or plaque holds one URL record, for example `https://victorbee.com/posh/#/c/PC-0412-B4-7781`. The chip serial number is registered in Posh Office and checked when Android reads the card.

* **iPhone**: hold the top of the phone to the card; tap the notification; Safari opens the card or passport page.
* **Android Chrome** and the **Posh Android app** read the card inside the app (serial + link), and Posh Office can write blank cards (Cards → ⓝ).
* **Writing from iPhone**: use the NFC Tools app (Write → Add a record → URL), then paste the card's serial number into Posh Office.

Note: NTAG213 chips can be cloned. For production use NTAG424 DNA (SUN signed links).

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ (relative paths: works in any folder)
node scripts/brand.mjs   # re-render icons, splash, favicons, OG image from src/brand/marks.ts
```

## Hosting on victorbee.com

`npm run build`, then upload the contents of `dist/` to the `posh/` folder of the site, so the app lives at `https://victorbee.com/posh/`. Routing uses `#/` links, so no server rewrite rules are needed. If you change the address, set `VITE_PUBLIC_URL` and rewrite the cards.

## Android APK

GitHub Actions (`.github/workflows/build.yml`) builds `Posh-Passport.apk` and `posh-web.zip` on every push to `main` and attaches them to the **latest** release. Locally: `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug` (needs the Android SDK).

The APK has Posh launcher icons (adaptive, round, monochrome), Posh splash screen, and opens directly when a Posh card or plaque is tapped.
