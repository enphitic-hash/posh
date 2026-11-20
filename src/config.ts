// Public demo config. The Supabase publishable key is safe to ship in a browser
// app: access is controlled by row level security on posh_records.
export const CONFIG = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://cfmyuedpxbtxblotrywn.supabase.co',
  supabaseKey: (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ?? 'sb_publishable_xpb9xJc1gO8GbndPniAgtQ_4ESIhYj9',
  // Public URL where the web build is hosted. NFC cards are written with links under this.
  publicUrl: (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? 'https://victorbee.com/posh/',
  company: {
    name: 'Posh Properties Ltd',
    tagline: 'We Build Your Dreams',
    address: 'Plot 301, Kira Road, Bukoto · near Kabira Country Club, Kampala',
    phone: '+256 414 662954',
    whatsapp: '256774755146',
    email: 'info@poshproperties.co.ug',
    web: 'www.poshproperties.co.ug',
    box: 'P.O. Box 114807 Kampala',
    tin: '1000 4471 26 (demo)',
    bank: { name: 'Stanbic Bank Uganda', branch: 'Bukoto branch', account: '9030 0123 4567 8', holder: 'Posh Properties Ltd', swift: 'SBICUGKX' },
    momo: { mtn: '*165*3# · Merchant 771 240', airtel: '*185*9# · Merchant 4471 26' },
  },
}
