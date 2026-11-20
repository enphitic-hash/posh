# Notes for coding agents

Read README.md first. Short version:

- `npm install`, `npm run dev`, `npm run build` (runs `tsc -b`, must pass with no errors).
- All record types are in `src/data/types.ts`; sample data in `src/data/seed.ts`. Adding a record kind: add it to `DB` and `KINDS`; old local/server copies get the new kind filled from the seed automatically (`fillMissing` in `src/data/store.ts`).
- Data sync: one Supabase table `posh_records(kind, id, data)`; see `supabase/schema.sql`. Writes go through `useStore().put/patch/remove`.
- Money documents (receipts, vouchers, invoices) are built in `src/lib/docs.ts` and shown/printed via `src/components/Checkout.tsx` (`Checkout`, `DocView`).
- NFC: `src/lib/nfc.ts` (Web NFC + the Capacitor `PoshNfc` plugin in `android/app/src/main/java/.../PoshNfcPlugin.java`). QR: `src/components/QrScanner.tsx`, `src/lib/printCard.ts`.
- Brand assets are generated: edit `src/brand/marks.ts`, then `npm run brand`.
- Browser tests: `scripts/e2e*.mjs` against `npx vite preview --port 4173`.
- Pushing to `main` builds the APK and web zip in GitHub Actions and updates the `latest` release.
