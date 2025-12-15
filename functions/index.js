const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// Config via:
// npx firebase functions:config:set clicksend.user="SEU_USER_CLICKSEND" clicksend.key="SUA_KEY_CLICKSEND" clicksend.from="Corujinha" clicksend.template="Olá, você acaba de receber... {clienteNome}... {link_midia}"
const CLICKSEND_USER = functions.config().clicksend?.user;
const CLICKSEND_KEY = functions.config().clicksend?.key;
const CLICKSEND_FROM = functions.config().clicksend?.from || 'Corujinha';
const TEMPLATE = functions.config().clicksend?.template ||
  'Olá, você acaba de receber uma mensagem especial enviada de {clienteNome}. Clique neste link para ver sua mensagem: {link_midia}';

if (!CLICKSEND_USER || !CLICKSEND_KEY) {
  console.warn('ClickSend não configurado: rode firebase functions:config:set clicksend.user="..." clicksend.key="..."');
}

async function sendSmsClicksend(to, body) {
  const url = 'https://rest.clicksend.com/v3/sms/send';
  const payload = {
    messages: [
      {
        source: 'sdk',
        from: CLICKSEND_FROM,
        body,
        to
      }
    ]
  };
  const resp = await axios.post(url, payload, {
    auth: { username: CLICKSEND_USER, password: CLICKSEND_KEY },
    timeout: 15000
  });
  return resp.data;
}

function formatMessage(template, contexto) {
  return template
    .replace(/{clienteNome}/g, contexto.clienteNome || '')
    .replace(/{destinatario\.nome}/g, contexto.destinatarioNome || '')
    .replace(/{link_midia}/g, contexto.link_midia || '')
    .replace(/{data}/g, contexto.data || '');
}

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.toString().replace(/\D/g, '');
  if (digits.length === 0) return null;
  // assume BR if 10/11 digits
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.length > 11 && digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.length > 11 && !digits.startsWith('+')) return `+${digits}`;
  return `+${digits}`;
}

const SENDING_TTL_MIN = 10; // TTL do lock
const LIMIT = 200; // máximo por execução

exports.sendScheduledMessages = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    try {
      const q = db.collection('agendamentos')
        .where('enviado', '==', false)
        .where('data_agendamento_ts', '<=', now)
        .limit(LIMIT);

      const snap = await q.get();
      if (snap.empty) {
        console.log('Nenhum agendamento pendente encontrado.');
        return null;
      }

      console.log(`Encontrados ${snap.size} agendamento(s) pendentes.`);

      for (const doc of snap.docs) {
        const docRef = doc.ref;
        const data = doc.data();

        if (data.status === 'cancelled' || data.status === 'cancelled_by_user') {
          console.log(`Pular cancelado: ${doc.id}`);
          continue;
        }

        let acquired = false;
        try {
          await db.runTransaction(async (tx) => {
            const d = await tx.get(docRef);
            const cur = d.data();
            if (!cur) return;
            if (cur.enviado) return;
            if (cur.sending && cur.sendingAt) {
              const sendingAt = cur.sendingAt.toDate ? cur.sendingAt.toDate() : new Date(cur.sendingAt);
              const ageMin = (Date.now() - sendingAt.getTime()) / (60 * 1000);
              if (ageMin < SENDING_TTL_MIN) return;
            }
            tx.update(docRef, {
              sending: true,
              sendingAt: admin.firestore.FieldValue.serverTimestamp(),
              sendingBy: `functions:${process.env.GCF_INSTANCE || 'unknown'}`
            });
            acquired = true;
          }, { maxAttempts: 2 });
        } catch (tErr) {
          console.error(`Transação falhou para ${doc.id}:`, tErr.message || tErr);
          acquired = false;
        }

        if (!acquired) {
          console.log(`Não foi possível adquirir lock para ${doc.id} (skip).`);
          continue;
        }

        const latestSnap = await docRef.get();
        const latest = latestSnap.data();
        if (!latest) {
          console.warn(`Documento removido entre etapas: ${doc.id}`);
          continue;
        }
        if (latest.enviado) {
          await docRef.update({ sending: admin.firestore.FieldValue.delete(), sendingAt: admin.firestore.FieldValue.delete(), sendingBy: admin.firestore.FieldValue.delete() }).catch(()=>{});
          continue;
        }
        if (latest.status === 'cancelled' || latest.status === 'cancelled_by_user') {
          await docRef.update({ sending: admin.firestore.FieldValue.delete(), sendingAt: admin.firestore.FieldValue.delete(), sendingBy: admin.firestore.FieldValue.delete() }).catch(()=>{});
          continue;
        }

        const rawPhone = (latest.destinatario && (latest.destinatario.telefone || latest.destinatarioPhone)) || latest.telefone || latest.destinatario_telefone;
        const to = normalizePhone(rawPhone);
        if (!to) {
          console.warn(`Sem telefone válido para doc ${doc.id} - marcando erro`);
          await docRef.update({
            envioErro: 'Sem telefone destinatario',
            envioErroAt: admin.firestore.FieldValue.serverTimestamp(),
            sending: admin.firestore.FieldValue.delete(),
            sendingAt: admin.firestore.FieldValue.delete()
          });
          continue;
        }

        const clienteNome = latest.clienteNome || latest.remetente?.nome || latest.remetenteNome || latest.cliente?.nome || '';
        const msg = formatMessage(TEMPLATE, {
          clienteNome,
          destinatarioNome: latest.destinatario?.nome || '',
          link_midia: latest.link_midia || latest.link || '',
          data: latest.data_agendamento || ''
        });

        try {
          const resp = await sendSmsClicksend(to, msg);
          await docRef.update({
            enviado: true,
            enviadoAt: admin.firestore.FieldValue.serverTimestamp(),
            envioResponse: resp,
            envioProvider: 'clicksend',
            sending: admin.firestore.FieldValue.delete(),
            sendingAt: admin.firestore.FieldValue.delete(),
            sendingBy: admin.firestore.FieldValue.delete()
          });
          console.log(`Enviado doc ${doc.id} -> ${to}`);
        } catch (sendErr) {
          console.error(`Erro no envio ClickSend doc ${doc.id}:`, sendErr.message || sendErr);
          await docRef.update({
            envioErro: String(sendErr.message || sendErr),
            envioErroAt: admin.firestore.FieldValue.serverTimestamp(),
            sending: admin.firestore.FieldValue.delete(),
            sendingAt: admin.firestore.FieldValue.delete(),
            sendingBy: admin.firestore.FieldValue.delete()
          });
        }
      }
    } catch (err) {
      console.error('Erro geral na função sendScheduledMessages:', err.message || err);
    }

    return null;
  });
