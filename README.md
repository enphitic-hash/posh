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

Any phone number and any 4-digit PIN sign in (a number that isn't a tenant opens the demo tenant, Nakato Sarah). In Posh Office pick any staff member, or "Someone else" and type any name, with any PIN. MoMo, Airtel and card PINs in the payment flows are any 4 digits. No real money moves.

### Money and receipts (Posh Office)

* **Cashier**: take payment for rent, house and plot sales, commission, construction stages, design, renovation, valuation, survey, short stays, deposits, mortgage advisory or anything typed in. Each payment walks through the real steps: MTN MoMo / Airtel prompt with the customer's PIN, card on the POS, bank transfer, cash with change, or cheque.
* **Receipts on everything**: every sale prints a receipt (80mm receipt printer or A4), PDF, WhatsApp or SMS, with a QR code that opens `#/r/<number>` to prove it's genuine.
* **Purchases & expenses**: anything Posh buys (cement, fuel, Yaka, wages, office supplies, landlord payouts) gets a printable payment voucher with signature lines, an optional photo of the supplier's receipt, and can be bought on credit and paid later.
* **Invoices**, **Receipts register** (search, reprint, CSV), **Finance** (money in/out, net, cash book by method, by business and expense type, six months), **Suppliers**, **Units & vacancies** (let a unit, take deposit, move out), **Leases** (renew with increase), **Staff**, **Broadcast** (WhatsApp/SMS to groups), **Activity log**. Sales deals, construction stages and valuations have "Take payment" buttons too.

## Live data

Phones and Posh Office share one Supabase table (`public.posh_records`) with realtime updates, so a rent payment on a phone appears on the Office screen at once. If the server can't be reached the app keeps working on that device. **Settings → Reset demo data** (Office) puts everything back to the starting sample.

Config is in `src/config.ts` (or `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_PUBLIC_URL`).

## NFC cards (NXP NTAG213)

Each card or plaque holds one URL record, for example `https://victorbee.com/posh/#/c/PC-0412-B4-7781`. The chip serial number is registered in Posh Office and checked when Android reads the card.

* **iPhone**: hold the top of the phone to the card; tap the notification; Safari opens the card or passport page.
* **Android Chrome** and the **Posh Android app** read the card inside the app (serial + link), and Posh Office can write blank cards (Cards → ⓝ).
* **Writing from iPhone**: use the NFC Tools app (Write → Add a record → URL), then paste the card's serial number into Posh Office.

**QR codes for phones without NFC**: every card and plaque also carries a QR code with the same link (plus `?via=qr`). Any phone camera opens it. The Posh app, Posh Office (NFC live monitor) and the home page also have a camera scanner, with a "use a photo" fallback. Cards → QR icon shows a card's code; **Print cards with QR** prints CR80 cards (front and back) and plaques.

**NFC live monitor** (`#/office/nfc`): every tap or scan, from any phone, appears at once and pops up on every Office screen, with the holder, chip serial check, home and rent status.

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
