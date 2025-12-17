/**
 * OWLRUNNER
 * Robô oficial de envio de SMS agendados
 * Regras:
 * - 6 execuções por dia (scheduler externo)
 * - 3 tentativas no dia do agendamento
 * - +3 tentativas no dia seguinte
 * - Após 6 falhas: SMS ao remetente
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ====== CONFIG ======
const TZ = 'America/Sao_Paulo';
const MAX_TENTATIVAS_DIA = 3;
const MAX_TENTATIVAS_TOTAL = 6;
const LIMIT_POR_EXECUCAO = 200;

// Secrets (já criados por você)
const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME;
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY;
const CLICKSEND_FROM = 'CorujinhaLegal';

// ====== HELPERS ======
function normalizePhone(raw) {
  if (!raw) return null;
  const d = raw.toString().replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if (d.startsWith('00')) return `+${d.slice(2)}`;
  return d.startsWith('+') ? d : `+${d}`;
}

async function sendSms(to, body) {
  const url = 'https://rest.clicksend.com/v3/sms/send';
  const payload = {
    messages: [{ source: 'sdk', from: CLICKSEND_FROM, body, to }]
  };
  const resp = await axios.post(url, payload, {
    auth: { username: CLICKSEND_USERNAME, password: CLICKSEND_API_KEY },
    timeout: 15000
  });
  return resp.data;
}

function sameDay(tsA, tsB) {
  const a = tsA.toDate();
  const b = tsB.toDate();
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

// ====== FUNÇÃO PRINCIPAL ======
exports.owlrunner = functions
  .region('us-central1')
  .pubsub.topic('owlrunner')
  .onPublish(async () => {

    if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
      console.error('Secrets do ClickSend não configurados.');
      return null;
    }

    const now = admin.firestore.Timestamp.now();

    const q = db.collection('agendamentos')
      .where('enviado', '==', false)
      .where('data_agendamento_ts', '<=', now)
      .limit(LIMIT_POR_EXECUCAO);

    const snap = await q.get();
    if (snap.empty) {
      console.log('owlrunner: nenhum agendamento pendente.');
      return null;
    }

    for (const doc of snap.docs) {
      const ref = doc.ref;
      const d = doc.data();

      if (d.falha_definitiva) continue;

      const tentTotal = d.tentativas_total || 0;
      const tentHoje = d.tentativas_hoje || 0;

      if (tentTotal >= MAX_TENTATIVAS_TOTAL) continue;

      const agTs = d.data_agendamento_ts;
      const hoje = now;

      // Reseta tentativas_hoje se virou o dia
      if (d.ultima_tentativa_em && !sameDay(d.ultima_tentativa_em, hoje)) {
        await ref.update({ tentativas_hoje: 0 });
      }

      const tentHojeAtual = (d.tentativas_hoje || 0);
      if (tentHojeAtual >= MAX_TENTATIVAS_DIA) continue;

      const to = normalizePhone(
        d.destinatario?.telefone || d.telefone || d.destinatario_telefone
      );
      if (!to) {
        await ref.update({
          tentativas_total: tentTotal + 1,
          tentativas_hoje: tentHojeAtual + 1,
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
        const novoTotal = tentTotal + 1;
        const novoHoje = tentHojeAtual + 1;

        const updates = {
          tentativas_total: novoTotal,
          tentativas_hoje: novoHoje,
          ultima_tentativa_em: admin.firestore.FieldValue.serverTimestamp(),
          ultimo_erro: String(err.message || err)
        };

        // Falha definitiva -> avisar remetente
        if (novoTotal >= MAX_TENTATIVAS_TOTAL) {
          const remetenteTel = normalizePhone(
            d.remetente?.telefone || d.telefone_remetente
          );
          if (remetenteTel) {
            const aviso = `Olá ${d.remetente?.nome || ''},
tentamos entregar sua mensagem por 2 dias, mas não obtivemos sucesso.`;
            try {
              await sendSms(remetenteTel, aviso);
            } catch (e) {
              console.error('Falha ao avisar remetente:', e.message || e);
            }
          }
          updates.falha_definitiva = true;
          updates.falha_notificada = true;
        }

        await ref.update(updates);
        console.error(`owlrunner: erro ${doc.id}`, err.message || err);
      }
    }

    return null;
  });
