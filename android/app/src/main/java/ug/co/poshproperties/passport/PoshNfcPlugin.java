package ug.co.poshproperties.passport;

import android.app.PendingIntent;
import android.content.Intent;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Posh NFC: reads the chip serial number and the URL written on Posh cards and plaques
 * (NXP NTAG213), and writes the Posh link onto blank cards.
 * Events: "tag" { serial, url } while scanning is on.
 */
@CapacitorPlugin(name = "PoshNfc")
public class PoshNfcPlugin extends Plugin {
    private boolean scanning = false;
    private String pendingWriteUrl = null;
    private PluginCall writeCall = null;

    @Override
    public void load() {
        // App opened by tapping a Posh card/plaque (NDEF_DISCOVERED intent filter)
        Intent i = getActivity().getIntent();
        if (i != null && NfcAdapter.ACTION_NDEF_DISCOVERED.equals(i.getAction())) handleOnNewIntent(i);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        NfcAdapter a = NfcAdapter.getDefaultAdapter(getContext());
        JSObject r = new JSObject();
        r.put("available", a != null);
        r.put("enabled", a != null && a.isEnabled());
        call.resolve(r);
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        scanning = true;
        enableDispatch();
        call.resolve();
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        scanning = false;
        if (pendingWriteUrl == null) disableDispatch();
        call.resolve();
    }

    @PluginMethod
    public void write(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("url is required"); return; }
        pendingWriteUrl = url;
        if (writeCall != null) writeCall.reject("Replaced by a new write");
        writeCall = call;
        call.setKeepAlive(true);
        enableDispatch();
    }

    private void enableDispatch() {
        getActivity().runOnUiThread(() -> {
            NfcAdapter a = NfcAdapter.getDefaultAdapter(getContext());
            if (a == null) return;
            Intent i = new Intent(getContext(), getActivity().getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int flags = Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0;
            PendingIntent pi = PendingIntent.getActivity(getContext(), 0, i, flags);
            try { a.enableForegroundDispatch(getActivity(), pi, null, null); } catch (Exception ignored) {}
        });
    }

    private void disableDispatch() {
        getActivity().runOnUiThread(() -> {
            NfcAdapter a = NfcAdapter.getDefaultAdapter(getContext());
            if (a == null) return;
            try { a.disableForegroundDispatch(getActivity()); } catch (Exception ignored) {}
        });
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (scanning || pendingWriteUrl != null) enableDispatch();
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        disableDispatch();
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
        if (tag == null) return;
        String serial = hex(tag.getId());

        if (pendingWriteUrl != null) {
            String url = pendingWriteUrl;
            pendingWriteUrl = null;
            PluginCall c = writeCall;
            writeCall = null;
            try {
                NdefMessage msg = new NdefMessage(new NdefRecord[] { NdefRecord.createUri(url) });
                Ndef ndef = Ndef.get(tag);
                if (ndef != null) {
                    ndef.connect();
                    if (!ndef.isWritable()) throw new Exception("This card is locked");
                    ndef.writeNdefMessage(msg);
                    ndef.close();
                } else {
                    NdefFormatable f = NdefFormatable.get(tag);
                    if (f == null) throw new Exception("This card cannot hold a link");
                    f.connect();
                    f.format(msg);
                    f.close();
                }
                JSObject r = new JSObject();
                r.put("serial", serial);
                if (c != null) { c.resolve(r); c.setKeepAlive(false); }
            } catch (Exception e) {
                if (c != null) { c.reject(e.getMessage() == null ? "Write failed" : e.getMessage()); c.setKeepAlive(false); }
            }
            if (!scanning) disableDispatch();
            return;
        }

        String url = null;
        NdefMessage m = null;
        android.os.Parcelable[] raw = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (raw != null && raw.length > 0) m = (NdefMessage) raw[0];
        if (m == null) {
            try { Ndef ndef = Ndef.get(tag); if (ndef != null) { ndef.connect(); m = ndef.getNdefMessage(); ndef.close(); } } catch (Exception ignored) {}
        }
        if (m != null) {
            for (NdefRecord r : m.getRecords()) {
                android.net.Uri u = r.toUri();
                if (u != null) { url = u.toString(); break; }
            }
        }
        JSObject ev = new JSObject();
        ev.put("serial", serial);
        if (url != null) ev.put("url", url);
        ev.put("scanning", scanning);
        notifyListeners("tag", ev, true);
    }

    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < b.length; i++) {
            if (i > 0) s.append(':');
            s.append(String.format("%02X", b[i]));
        }
        return s.toString();
    }
}
