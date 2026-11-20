import { useParams, Link } from 'react-router-dom'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { useStore, list } from '../data/store'
import { docFromPayment, docFromTxn, docFromInvoice } from '../lib/docs'
import { ugx, fmtDT } from '../lib/format'
import { Card, ThemedLogo, Badge } from '../components/ui'
import { DocView } from '../components/Checkout'

/** What anyone sees after scanning the QR on a Posh receipt, voucher or invoice. */
export default function ReceiptCheck() {
  const { no } = useParams()
  const db = useStore((s) => s.db)
  const pay = list(db, 'payments').find((p) => p.receipt === no)
  const txn = list(db, 'txns').find((t) => t.no === no)
  const inv = list(db, 'invoices').find((i) => i.no === no)
  const doc = pay ? docFromPayment(db, pay) : txn ? docFromTxn(db, txn) : inv ? docFromInvoice(inv) : null
  return (
    <div className="min-h-dvh bg-bg p-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/"><ThemedLogo className="w-36" sub="PROPERTIES LTD" /></Link>
        <Card className={`p-4 mt-4 flex items-center gap-3 ${doc ? '' : 'border-posh-red'}`}>
          {doc ? <ShieldCheck className="text-brand shrink-0" size={32} /> : <ShieldAlert className="text-posh-red shrink-0" size={32} />}
          <div>
            <div className="font-extrabold text-lg">{doc ? 'Genuine Posh document' : 'Not found'}</div>
            <div className="text-sm text-muted">{doc ? `${no} · ${ugx(doc.paid || doc.total)} · ${fmtDT(doc.at)}` : `No Posh receipt, voucher or invoice numbered ${no}. Call Posh on +256 414 662954 before you rely on it.`}</div>
          </div>
          {doc && <Badge tone="green" className="ml-auto">Checked just now</Badge>}
        </Card>
        {doc && <div className="mt-4"><DocView doc={doc} /></div>}
      </div>
    </div>
  )
}
