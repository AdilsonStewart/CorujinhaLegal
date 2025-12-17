const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ===== CONFIGURAÇÕES =====
const MAX_TENTATIVAS_DIA = 3;
const MAX_TENTATIVAS_TOTAL = 6;
const LIMIT_POR_EXECUCAO = 200;
const CLICKSEND_FROM = 'CorujinhaLegal';

// Secrets (Secret Manager)
const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME;
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY;

// ===== HELPERS =====
function normalizePhone(raw) {
  if (!raw) return null;
  const d = raw.toString().replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if (d.startsWith('00')) return `+${d.slice(2)}`;
  return d.startsWith('+') ? d : `+${d}`;
}

async function sendSms(to, body) {
  const url = 'https://rest.clicksend.com/v3/sms/send';
  return axios.post(url, {
    messages: [{ source: 'sdk', from: CLICKSEND_FROM, body, to }]
  }, {
    auth: { username: CLICKSEND_USERNAME, password: CLICKSEND_API_KEY },
    timeout: 15000
  });
}

function isSameDay(a, b) {
  const da = a.toDate();
  const db = b.toDate();
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

// ===== FUNÇÃO PRINCIPAL =====
async function runOwlrunner() {
  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    console.error('Secrets do ClickSend não configurados.');
    return null;
  }

  const now = admin.firestore.Timestamp.now();

  const snap = await db.collection('agendamentos')
    .where('enviado', '==', false)
    .where('data_agendamento_ts', '<=', now)
    .limit(LIMIT_POR_EXECUCAO)
    .get();

  if (snap.empty) {
    console.log('owlrunner: nada para enviar.');
    return null;
  }

  for (const doc of snap.docs) {
    const ref = doc.ref;
    const d = doc.data();

    if (d.falha_definitiva) continue;

    let tentTotal = d.tentativas_total || 0;
    let tentHoje = d.tentativas_hoje || 0;

    if (tentTotal >= MAX_TENTATIVAS_TOTAL) continue;

    if (d.ultima_tentativa_em && !isSameDay(d.ultima_tentativa_em, now)) {
      tentHoje = 0;
    }

    if (tentHoje >= MAX_TENTATIVAS_DIA) continue;

    const to = normalizePhone(d.destinatario?.telefone || d.telefone);
    if (!to) {
      await ref.update({
        tentativas_total: tentTotal + 1,
        tentativas_hoje: tentHoje + 1,
        ultima_tentativa_em: admin.firestore.FieldValue.serverTimestamp(),
        ultimo_erro: 'Telefone inválido'
      });
      continue;
    }

    const msg = `Olá ${d.destinatario?.nome || ''},
você acaba de receber uma mensagem de ${d.remetente?.nome || ''}.
Acesse este link: ${d.link_midia || ''}`;

    try {
      await sendSms(to, msg);
      await ref.update({
        enviado: true,
        enviado_em: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`owlrunner: enviado ${doc.id}`);
    } catch (err) {
      tentTotal++;
      tentHoje++;

      const update = {
        tentativas_total: tentTotal,
        tentativas_hoje: tentHoje,
        ultima_tentativa_em: admin.firestore.FieldValue.serverTimestamp(),
        ultimo_erro: String(err.message || err)
      };

      if (tentTotal >= MAX_TENTATIVAS_TOTAL) {
        const remetenteTel = normalizePhone(d.remetente?.telefone);
        if (remetenteTel) {
          try {
            await sendSms(
              remetenteTel,
              `Olá ${d.remetente?.nome || ''},
tentamos entregar sua mensagem por 2 dias sem sucesso.`
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

// ===== 6 SCHEDULERS FIREBASE =====
exports.owlrunner_08 = functions.pubsub.schedule('0 8 * * *').timeZone('America/Sao_Paulo').onRun(runOwlrunner);
exports.owlrunner_10 = functions.pubsub.schedule('0 10 * * *').timeZone('America/Sao_Paulo').onRun(runOwlrunner);
exports.owlrunner_12 = functions.pubsub.schedule('0 12 * * *').timeZone('America/Sao_Paulo').onRun(runOwlrunner);
exports.owlrunner_14 = functions.pubsub.schedule('0 14 * * *').timeZone('America/Sao_Paulo').onRun(runOwlrunner);
exports.owlrunner_16 = functions.pubsub.schedule('0 16 * * *').timeZone('America/Sao_Paulo').onRun(runOwlrunner);
exports.owlrunner_18 = functions.pubsub.schedule('0 18 * * *').timeZone('America/Sao_Paulo').onRun(runOwlrunner);
