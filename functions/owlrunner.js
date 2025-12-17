const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Horários válidos (em horas cheias)
const HORARIOS_VALIDOS = [8, 10, 12, 14, 16, 18];

function podeTentarAgora(doc, agora) {
  const dataAgendamento = doc.data_agendamento_ts.toDate();
  const tentativas = doc.tentativas || 0;

  const diaAgendamento = new Date(
    dataAgendamento.getFullYear(),
    dataAgendamento.getMonth(),
    dataAgendamento.getDate()
  );

  const diaHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );

  const diffDias =
    (diaHoje.getTime() - diaAgendamento.getTime()) / (1000 * 60 * 60 * 24);

  // Só dia 0 (agendamento) ou dia 1 (dia seguinte)
  if (diffDias < 0 || diffDias > 1) return false;

  // Limite de tentativas
  if (tentativas >= 6) return false;
  if (diffDias === 0 && tentativas >= 3) return false;
  if (diffDias === 1 && tentativas < 3) return false;

  const horaAtual = agora.getHours();
  const horaAgendada = parseInt(doc.hora_agendamento.split(":")[0], 10);

  if (!HORARIOS_VALIDOS.includes(horaAtual)) return false;
  if (horaAtual < horaAgendada) return false;

  return true;
}

async function enviarSMS(telefone, mensagem) {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;

  const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");

  await axios.post(
    "https://rest.clicksend.com/v3/sms/send",
    {
      messages: [
        {
          source: "owlrunner",
          body: mensagem,
          to: telefone,
        },
      ],
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    }
  );
}

exports.owlrunner = functions.https.onRequest(async (req, res) => {
  const agora = new Date();

  const snapshot = await db
    .collection("agendamentos")
    .where("enviado", "==", false)
    .get();

  for (const docSnap of snapshot.docs) {
    const doc = docSnap.data();

    if (!podeTentarAgora(doc, agora)) continue;

    try {
      const texto = `Olá ${doc.destinatario.nome}, você acaba de receber uma mensagem de ${doc.remetente.nome}. Acesse este link para a mensagem: ${doc.link_midia}`;

      await enviarSMS(doc.destinatario.telefone, texto);

      await docSnap.ref.update({
        enviado: true,
        enviado_em: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      const tentativas = (doc.tentativas || 0) + 1;

      await docSnap.ref.update({
        tentativas,
        ultima_tentativa_em: admin.firestore.FieldValue.serverTimestamp(),
        ultimo_erro: error.message,
      });

      // Avisar remetente após 6 falhas
      if (tentativas === 6 && !doc.aviso_remetente_enviado) {
        const aviso = `Olá ${doc.remetente.nome}, não conseguimos entregar a mensagem para ${doc.destinatario.nome}. Foram realizadas 6 tentativas em dois dias, sem sucesso.`;

        await enviarSMS(doc.remetente.telefone, aviso);

        await docSnap.ref.update({
          aviso_remetente_enviado: true,
        });
      }
    }
  }

  res.status(200).send("owlrunner executado com sucesso");
});
