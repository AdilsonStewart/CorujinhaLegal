import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';

export default function SendNowButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const functions = getFunctions(app);

  const handleClick = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const fn = httpsCallable(functions, 'sendNow'); // precisa existir no backend
      const res = await fn({ test: true });
      setMsg({ ok: true, data: res.data });
    } catch (err) {
      setMsg({ ok: false, error: err.message || String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={handleClick} disabled={busy}>
        {busy ? 'Enviando...' : 'Disparar envio (sendNow)'}
      </button>
      {msg && (
        <pre style={{ marginTop: 8 }}>{JSON.stringify(msg, null, 2)}</pre>
      )}
    </div>
  );
}
