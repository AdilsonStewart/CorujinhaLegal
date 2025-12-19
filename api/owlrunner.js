const admin = require('firebase-admin');
const axios = require('axios');

if (!admin.apps.length) {
  admin.initializeApp();
}

const TIMEZONE = 'America/Sao_Paulo';
const MAX_TENTATIVAS = 3;
const ALLOWED_HOURS = ['08:00','10:00','12:00','14:00','16:00','18:00'];

// credenciais ClickSend
const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME;
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY;

// normaliza número → +5511999999999
function normalizePhone(raw) {
  if (!raw) return null;
  let d = raw.toString().replace(/\D/g, '');
  if (d.startsWith('55') && d.length === 13) return `+${d}`;
  if (d.length === 11) return `+55${d}`;
  if (raw.startsWith('+55')) return raw;
  return `+${d}`;
}

async function sendSms(to, body) {
  return axios.post(
    'https://rest.clicksend.com/v3/sms/send',
    {
      messages: [{ source: 'sdk', from: 'CorujinhaLegal', body, to }]
    },
    {
      auth: { username: CLICKSEND_USERNAME, password: CLICKSEND_API_KEY },
      timeout: 15000
    }
  );
}

function nowSP() {
  return new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
}

function getTodaySP() {
  const d = new Date(nowSP());
  return d.toISOString().slice(0, 10);
}

function getHourSP() {
  const d = new Date(nowSP());
  return d.toTimeString().slice(0, 5);
}

module.exports = async (req, res) => {
  // valida secret opcional, se quiser
  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    return res.status(500).json({ error: 'ClickSend secrets not set' });
  }

  const currentHour = getHourSP();
  const today = getTodaySP();

  // só processar nos horários permitidos
  if (!ALLOWED_HOURS.includes(currentHour)) {
    return res.status(200).json({ message: `runner ok, skipping - hour ${currentHour}` });
  }

  const db = admin.firestore();

  try {
    const snap = await db.collection('agendamentos')
      .where('data_agendamento', '==', today)
      .where('hora_agendamento', '==', currentHour)
      .where('enviado', '==', false)
      .limit(50)
      .get();

    if (snap.empty) {
      return res.status(200).json({ processed: 0, message: 'no pending messages' });
    }

    const results = [];

    for (const doc of snap.docs) {
      const ref = doc.ref;
      const d = doc.data();

      const tent = d.tentativas_total || 0;
      const destName = d.destinatario || 'Amigo';
      const senderName = d.remetente || 'Alguém';
      const telDest = normalizePhone(d.telefone);
      const telRem = normalizePhone(d.telefone_remetente);
      const url = d.link_midia || '';

      if (!telDest) {
        await ref.update({
          tentativas_total: tent + 1,
          ultimo_erro: 'telefone invalido'
        });
        results.push({ id: doc.id, status: 'telefone_invalido' });
        continue;
      }

      // mensagem ao destinatário
      const body = `Olá ${destName},\nvocê recebeu uma mensagem de ${senderName}.\nClique no link: ${url}`;

      try {
        await sendSms(telDest, body);

        // sucesso
        await ref.update({
          enviado: true,
          enviado_em: admin.firestore.FieldValue.serverTimestamp(),
          tentativas_total: tent,
          ultimo_erro: null
        });

        results.push({ id: doc.id, status: 'enviado' });

      } catch (err) {
        const novoTotal = tent + 1;

        const update = {
          tentativas_total: novoTotal,
          ultimo_erro: String(err.message || err),
          ultima_tentativa_em: admin.firestore.FieldValue.serverTimestamp()
        };

        // 3º erro → notifica remetente
        if (novoTotal >= MAX_TENTATIVAS) {
          if (telRem) {
            try {
              await sendSms(
                telRem,
                `Olá ${senderName},\nnão conseguimos entregar sua mensagem após ${MAX_TENTATIVAS} tentativas.`
              );
            } catch (_) {}
          }

          update.falha_definitiva = true;
          update.enviado = false;
        }

        await ref.update(update);

        results.push({ id: doc.id, status: 'falha', tentativas: novoTotal });
      }
    }

    return res.status(200).json({ processed: results.length, results });

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
