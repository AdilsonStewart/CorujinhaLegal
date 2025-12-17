const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.owlrunner_08 = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(() => runOwlrunner());

exports.owlrunner_10 = functions.pubsub
  .schedule('0 10 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(() => runOwlrunner());

exports.owlrunner_12 = functions.pubsub
  .schedule('0 12 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(() => runOwlrunner());

exports.owlrunner_14 = functions.pubsub
  .schedule('0 14 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(() => runOwlrunner());

exports.owlrunner_16 = functions.pubsub
  .schedule('0 16 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(() => runOwlrunner());

exports.owlrunner_18 = functions.pubsub
  .schedule('0 18 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(() => runOwlrunner());

/* =========================
   LÓGICA DO ROBÔ (ISOLADA)
   ========================= */

async function runOwlrunner() {
  const axios = require('axios');
  const db = admin.firestore();

  const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME;
  const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY;

  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    console.error('Secrets do ClickSend não configurados.');
    return null;
  }

  const MAX_TENTATIVAS_DIA = 3;
  const MAX_TENTATIVAS_TOTAL = 6;
  const LIMIT = 200;
  const now = admin.firestore.Timestamp.now();

  function normalizePhone(raw) {
    if (!raw) return null;
    const d = raw.toString().replace(/\D/g, '');
    if (d.length === 10 || d.length === 11) return `+55${d}`;
    if (d.startsWith('00')) return `+${d.slice(2)}`;
    return d.startsWith('+') ? d : `+${d}`;
  }

  async function sendSms(to, body) {
    return axios.post(
      'https://rest.clicksend.com/v3/sms/send',
      {
        messages: [{ source: 'sdk', from: 'CorujinhaLegal', body, to }]
      },
      {
        auth: {
          username: CLICKSEND_USERNAME,
          password: CLICKSEND_API_KEY
        },
        timeout: 15000
      }
    );
  }

  const snap = await db.collection('agendamentos')
    .where('enviado', '==', false)
    .where('data_agendamento_ts', '<=', now)
    .limit(LIMIT)
    .get();

  if (snap.empty) {
    console.log('owlrunner: nenhum envio pendente');
    return null;
  }

  for (const doc of snap.docs) {
    const ref = doc.ref;
    const d = doc.data();

    const tentTotal = d.tentativas_total || 0;
    const tentHoje = d.tentativas_hoje || 0;

    if (tentTotal >= MAX_TENTATIVAS_TOTAL || tentHoje >= MAX_TENTATIVAS_DIA) {
      continue;
    }

    const to = normalizePhone(d.destinatario?.telefone);
    if (!to) continue;

    const msg = `Olá ${d.destinatario?.nome || ''},
você acaba de receber uma mensagem de ${d.remetente?.nome || ''}.
Acesse este link: ${d.link_midia || ''}`;

    try {
      await sendSms(to, msg);
      await ref.update({
        enviado: true,
        enviado_em: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      const total = tentTotal + 1;
      const hoje = tentHoje + 1;

      const update = {
        tentativas_total: total,
        tentativas_hoje: hoje,
        ultima_tentativa_em: admin.firestore.FieldValue.serverTimestamp(),
        ultimo_erro: String(err.message || err)
      };

      if (total >= MAX_TENTATIVAS_TOTAL) {
        const telRem = normalizePhone(d.remetente?.telefone);
        if (telRem) {
          try {
            await sendSms(
              telRem,
              `Olá ${d.remetente?.nome || ''},
não conseguimos entregar sua mensagem após 2 dias.`
            );
          } catch (_) {}
        }
        update.falha_definitiva = true;
        update.falha_notificada = true;
      }

      await ref.update(update);
    }
  }

  return null;
}
