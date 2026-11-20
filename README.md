# Posh Passport

A complete working demo for **Posh Properties Ltd** (Plot 301 Kira Road, Bukoto, Kampala). It runs every Posh business from one system: property sales, construction, property management and rentals, valuation and survey, and mortgage advisory. Each property has one shared record, its **Posh Passport**. Tenants pay rent by tapping a **Posh NFC card** or scanning its **QR code**. Buyers check that a property is genuine by tapping or scanning its plaque. The office sees everything live.

Built by Victor Bee Technologies, Mbarara. All names, units and money are sample data, and no real payments are made.

| Get it | Where |
|---|---|
| Android app (APK) | [Releases → latest → `Posh-Passport.apk`](../../releases/tag/latest) |
| Web build, ready to upload | [Releases → latest → `posh-web.zip`](../../releases/tag/latest) |
| Source code | this repository (`main`) |
| Database | `supabase/schema.sql` and `supabase/seed.sql` |
| Original Posh logos (reference) | `brand/source/` |

Every push to `main` rebuilds the APK and the web zip on GitHub Actions and replaces the files in the **latest** release.

---

## 1. What's inside

| Part | Address | Who uses it |
|---|---|---|
| **Home page** | `#/` | Anyone. Links to the app and the Office, verifies a plaque, and scans a QR code. |
| **Posh app** | `#/app` (web, installable) and the Android APK | **Tenants** pay rent by card tap, QR, MTN MoMo, Airtel Money, Visa or Mastercard, bank or Posh Wallet, can split a payment, and get PDF, printed and WhatsApp receipts. They also report repairs with photos and see their lease and visitor gate pass. **Buyers** get AI home matching, the Posh Verified filter, viewing bookings and Home Finance. **Building clients** see progress, site photos and stage payments from abroad. **Landlords** get statements, URA tax figures and PDFs. **Staff** have a site manager mode (crew clock-in, wages, materials, issues) and a caretaker round. |
| **Posh Office** | `#/office` | Office staff. See section 2. |
| **Plaque page** | `#/p/PP-KLA-0412` | What anyone sees after tapping or scanning a property plaque. |
| **Card page** | `#/c/PC-0412-B4-7781` | What a phone opens after tapping or scanning a Posh card. Rent can be paid from here. |
| **Receipt check** | `#/r/SR-5101` | Opened by the QR code on every printed receipt, voucher or invoice to prove it is genuine. |

Every screen has **Settings** for light, dark or phone theme, 4 text sizes and reduce motion.

## 2. Posh Office modules

* **Money**
  * **Dashboard**
  * **Cashier**: take payment for rent, house and plot sales, commission, construction stages, design, renovation, valuation, survey, short stays, deposits, mortgage advisory, or anything typed in.
  * **Receipts register**: search, reprint and CSV export.
  * **Invoices**: create, print and take payment.
  * **Purchases & expenses**: every purchase gets a payment voucher. Optional photo of the supplier's receipt. Items can be bought on credit and paid later.
  * **Finance**: money in and out, net, cash book by payment method, by business and expense type, and six months of history.
* **Rentals**
  * **Rent & payments**: includes a Posh AI list of likely late payers with friendly reminders.
  * **Units & vacancies**: let a unit, take the deposit, move a tenant out.
  * **Leases**: renew, with an optional rent increase.
  * **Tenants**, **Landlords** (with statements), **Repairs** board.
* **Property**
  * **Posh Passports** with a story timeline.
  * **Construction**: sites, with stage payments and receipts.
  * **Sales & listings**: pipeline, viewings, and "Take payment" on deals.
  * **Valuations** (with fees), **Home Finance**, **Suppliers**.
* **Cards & people**
  * **NFC live monitor**: every card or plaque tap and QR scan, from any phone, appears at once and pops up on every Office screen.
  * **NFC cards & QR**: issue, write, register a chip, block, show the QR, and print cards and plaques with QR codes.
  * **Messages**, **Broadcast** (WhatsApp or SMS to groups), **Staff**, **Activity log**, **Settings** (with *Reset demo data*).

**How payments are shown (simulated, no real APIs):**
* **MTN MoMo and Airtel:** a prompt goes to the customer's phone, which appears on screen. Typing any PIN approves it.
* **Visa and Mastercard:** a POS terminal walks through tap, PIN and approval.
* **Bank transfer:** shows the Posh account details and asks for the bank reference.
* **Cash:** works out the change.
* **Cheque:** records the cheque number and bank.

Every money document can be printed on an **80mm receipt printer** or **A4**, saved as a **PDF**, or sent by **WhatsApp** or **SMS**.

## 3. Demo logins

Logins are open for the demo:

| Where | How |
|---|---|
| Posh app, tenant | **Any phone number and any 4-digit PIN.** A number that isn't a tenant opens the demo tenant, Nakato Sarah (Naguru Heights B4, `+256 772 300 412`). |
| Posh Office | Pick any staff member, or **"Someone else"** and type any name. Any PIN works. |
| MoMo, Airtel and card PINs | Any 4 digits |
| Card number in the app | `4111 1111 1111 1111` (pre-filled) |

The demo card **PC-0412-B4-7781** (Nakato Sarah) has the NTAG213 chip `04:73:D4:CA:04:19:90` registered. The demo plaque is **PP-KLA-0412**.

## 4. Project structure

```
src/
  main.tsx            routes (HashRouter): / , /app/*, /office/*, /p/:code, /c/:cardId, /r/:no
  config.ts           Supabase URL/key, public URL, company details (address, TIN, bank, MoMo)
  Landing.tsx         home page
  app/                Posh app screens: MobileApp (shell, NFC/QR sheet), Tenant, Buyer, Client, Landlord, Staff
  office/             Posh Office: Office (layout, menu), Dashboard, Rentals, Repairs, Cards, Passports,
                      Business (construction, sales, valuations, mortgages, messages), Money (cashier, receipts,
                      invoices, purchases, finance, suppliers), People (units, leases, staff, broadcast, activity),
                      NfcLive (live monitor + tap pop-up)
  verify/             public pages: Verify (plaque), CardPage, ReceiptCheck
  components/         ui kit, Settings, Checkout (payment flows + receipt view), QrScanner
  data/               types.ts (all record types), seed.ts (sample data), store.ts (live sync), prefs.ts
  lib/                format, logic (rent, AI risk, matching, payments), nfc (Web NFC + Android plugin),
                      docs (receipts/vouchers/invoices + printing), pdf, printCard (QR cards and plaques)
  brand/marks.ts      the Posh logo, icon and seal, drawn as SVG (source for every brand asset)
public/               icons, favicons, manifest, brand/ (rendered logos, seal, OG image, splash)
android/              Capacitor Android project, with the PoshNfc Java plugin
                      (android/app/src/main/java/.../PoshNfcPlugin.java) and NFC intent filters
resources/            Android launcher icons and splash screens (rendered)
supabase/             schema.sql (table, security policies, realtime), seed.sql (sample data)
brand/source/         the original Posh Properties logos used as reference
scripts/              brand.mjs (render all icons/logos), seed-sql.mjs, e2e*.mjs (browser tests), qa.mjs
.github/workflows/    build.yml: web build + APK + release (+ optional Cloudflare Pages deploy)
```

Tech: Vite, React 19, TypeScript, Tailwind CSS 4, zustand, React Router (hash routes), Supabase (Postgres + realtime), Capacitor 8 (Android), jsPDF, qrcode, jsQR.

## 5. Run it locally

Needs Node 22+.

```bash
git clone https://github.com/<owner>/posh.git
cd posh
npm install
npm run dev        # http://localhost:5173  (#/app, #/office)
npm run build      # production build in dist/ (relative paths: works in any folder)
```

The app works straight away from built-in sample data, even with no database. Data is saved in the browser. When the database is reachable the status shows **Live**, and every phone and Office screen shares the same data.

## 6. Database (Supabase)

Everything lives in one table, `public.posh_records (kind, id, data jsonb, updated_at)`, with realtime turned on.

To use your own Supabase project:

1. Create a project at supabase.com.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Optional: run `supabase/seed.sql` to load the sample data. If you skip this, the app loads it automatically the first time it finds the table empty.
4. Go to **Project Settings → API**. Copy the **Project URL** and the **publishable (anon) key**.
5. Put both in `src/config.ts`, or create `.env.local` from `.env.example`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_...
   ```
6. Rebuild.

**Posh Office → Settings → Reset demo data** puts everything back to the starting sample. After changing `src/data/seed.ts`, run `npm run seed:sql` to regenerate `seed.sql`.

The policies in `schema.sql` are open, which suits a demo. For production, tie them to Supabase Auth users and roles.

## 7. Host it at victorbee.com/posh (Cloudflare)

Routing uses `#/` links and relative paths, so the build works from any folder and no rewrite rules are needed.

**Option A: upload the zip.**
1. Download `posh-web.zip` from the latest release, or run `npm run build` and use `dist/`.
2. Unzip it into the `posh/` folder of the site, so `https://victorbee.com/posh/index.html` exists.
   * If victorbee.com is a Cloudflare Pages project built from a repo, put the files in that repo's output folder under `posh/` and push.
   * For a direct-upload Pages project, add `posh/` to the uploaded folder and deploy again.

**Option B: automatic deploy from GitHub.**
1. Add repository secrets `CLOUDFLARE_API_TOKEN` (permission: *Cloudflare Pages: Edit*) and `CLOUDFLARE_ACCOUNT_ID`.
2. Optionally add a repository variable `CF_PAGES_PROJECT` (default `posh-passport`).
3. Every push now deploys `dist/` to that Pages project, for example `posh-passport.pages.dev`.
4. To serve it under `victorbee.com/posh`, either:
   * attach a subdomain such as `posh.victorbee.com` to the project, or
   * add a Cloudflare Worker route `victorbee.com/posh/*` that proxies to the Pages URL.

**If the address changes** (for example to `posh.victorbee.com`), set `VITE_PUBLIC_URL` and rebuild. The cards must then be rewritten and the QR codes reprinted, because they hold the full link.

## 8. Android APK

* **Download:** `Posh-Passport.apk` from the latest release. On the phone, allow "install unknown apps".
* **Build on GitHub:** push to `main` or run the workflow by hand (Actions → *Build web + Android APK* → Run workflow). This needs nothing set up, because the GitHub runner has the Android SDK.
* **Build locally:** this needs the Android SDK and JDK 21.
  ```bash
  npm run android     # build web, cap sync, gradle assembleDebug
  # APK: android/app/build/outputs/apk/debug/app-debug.apk
  ```

The APK opens directly when a Posh card or plaque is tapped. It has Posh launcher icons (adaptive, round, monochrome), a Posh splash screen, and reads the chip serial for the anti-copy check. App id: `ug.co.poshproperties.passport`.

The APK is a debug build, which is fine for a demo. For the Play Store, make a release keystore and run `./gradlew bundleRelease`.

## 9. NFC cards and QR codes

The cards are **NXP NTAG213** (NFC Forum Type 2, 144 bytes usable). Each card or plaque holds **one URL record**:

* Card: `https://victorbee.com/posh/#/c/PC-0412-B4-7781`
* Plaque: `https://victorbee.com/posh/#/p/PP-KLA-0412`

The **chip serial number** is registered in Posh Office. The app compares it on every Android read, so a copied link on a different chip shows as **"chip does not match"**.

**Reading a card**
* **iPhone:** unlock it and hold the top of the phone to the card. Tap the Posh notification and Safari opens the card or plaque page.
* **Android:** turn NFC on and hold the card to the back of the phone. The Posh app opens on the card, or Chrome opens the page.
* **No NFC:** scan the **QR code** printed on the card or plaque with the phone camera. Or use **Scan QR code** in the Posh app, on the home page, or in Posh Office (*NFC live monitor → Scan QR with camera*). QR links end in `?via=qr`, so the Office knows whether it was a tap or a scan.

**Writing a new card**
1. Posh Office → **NFC cards & QR** → **Issue card**. This creates the card number.
2. Then write the link to the card:
   * **Android (Chrome or the Posh app):** press *Write card*, hold the blank card to the phone, then hold it again to register its serial.
   * **iPhone:** install **NFC Tools**. Go to *Write → Add a record → URL*, paste the card's link and write it. Then *Read* the card, copy the **Serial number**, and paste it into Posh Office.
3. Optional: in **NFC Tools → Other → Lock tag**, make the card read-only. **This cannot be undone.**

**Printing cards and plaques with QR codes**
* Posh Office → **NFC cards & QR** → **Print cards with QR**. This prints CR80 cards, front and back, and plaques on A4.
* For a single card, use the QR icon on its row and press *Print card*.

**Security note:** NTAG213 chips can be cloned and QR codes can be photographed. That is fine for a demo. For production, use **NTAG 424 DNA** cards, which make signed links that change on every tap (SUN), and require a PIN for payments.

## 10. Tests

```bash
npm run build && npx vite preview --port 4173 &
node scripts/e2e.mjs /tmp/out          # tenant pays by card tap + MoMo, repair, Office
node scripts/e2e-money.mjs /tmp/out    # cashier: MoMo, cash with change, card POS, bank, rent, purchases, invoices, print
node scripts/e2e-qr.mjs /tmp/out       # needs /tmp/out/cam.y4m (a fake camera showing a card QR): QR scan in app and Office
```

The tests use Playwright with Chromium.

## 11. Brand

`src/brand/marks.ts` draws the Posh mark (red and green towers, serif POSH, red/green rule), the app icon and the Posh Passport seal. `npm run brand` renders everything from it into `public/` and `resources/android/`: icons, favicons, splash screens, the OG image and the brand sheet. Colours: red `#ED1F24`, green `#136734`, deep green `#062E17`, gold `#C9A227`, ink `#231F20`.
