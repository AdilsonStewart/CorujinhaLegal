// robo.js – versão ajustada para CorujinhaLegal2 (SEM TRAVA DE HORÁRIO)
const admin = require("firebase-admin");
const axios = require("axios");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
}

const TIMEZONE = "America/Sao_Paulo";
const MAX_TENTATIVAS = 3;

const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME;
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY;

function normalizePhone(raw) {
  if (!raw) return null;
  let d = raw.toString().replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 13) return `+${d}`;
  if (d.length === 11) return `+55${d}`;
  if (raw.startsWith("+55")) return raw;
  return `+${d}`;
}

async function sendSms(to, body) {
  return axios.post(
    "https://rest.clicksend.com/v3/sms/send",
    { messages: [{ source: "sdk", body, to }] },
    {
      auth: { username: CLICKSEND_USERNAME, password: CLICKSEND_API_KEY },
      timeout: 15000
    }
  );
}

function nowSP() {
  return new Date().toLocaleString("en-US", { timeZone: TIMEZONE });
}

function getTodaySP() {
  const d = new Date(nowSP());
  return d.toISOString().slice(0, 10);
}

function getHourSP() {
  const d = new Date(nowSP());
  return d.toTimeString().slice(0, 5); // HH:MM
}

async function run() {
  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    console.error("ClickSend secrets missing");
    return;
  }

  const today = getTodaySP();
  const currentHour = getHourSP();

  console.log(`Runner iniciado | Data: ${today} | Hora atual: ${currentHour}`);

  const db = admin.firestore();

  try {
    const snap = await db
      .collection("agendamentos")
      .where("data_agendamento", "==", today)
      .where("enviado", "==", false)
      .limit(50)
      .get();

    if (snap.empty) {
      console.log("No pending messages for today");
      return;
    }

    for (const doc of snap.docs) {
      const ref = doc.ref;
      const d = doc.data();

      const horaAgendada = d.hora_agendamento; // "HH:MM"

      // ⏱️ REGRA PRINCIPAL: ainda não chegou a hora → pula
      if (!horaAgendada || horaAgendada > currentHour) {
        continue;
      }

      const tent = d.tentativas_total || 0;

      const destName = d.destinatario || "Amigo";
      const senderName = d.remetente || "Alguém";

      const telDest = normalizePhone(
        d.telefone_destinatario || d.telefone
      );

      const telRem = normalizePhone(d.telefone_remetente);
      const url = d.link_midia || "";

      if (!telDest) {
        await ref.update({
          tentativas_total: tent + 1,
          ultimo_erro: "telefone invalido"
        });
        console.log(`Telefone inválido: ${doc.id}`);
        continue;
      }

      const body =
        `Olá ${destName},\n` +
        `você recebeu uma mensagem de ${senderName}.\n` +
        `Clique no link: ${url}`;

      try {
        await sendSms(telDest, body);

        await ref.update({
          enviado: true,
          enviado_em: admin.firestore.FieldValue.serverTimestamp(),
          tentativas_total: tent,
          ultimo_erro: null
        });

        console.log(`Sucesso: ${doc.id}`);

      } catch (err) {
        const novoTotal = tent + 1;

        const update = {
          tentativas_total: novoTotal,
          ultimo_erro: String(err.message || err),
          ultima_tentativa_em: admin.firestore.FieldValue.serverTimestamp()
        };

        if (novoTotal >= MAX_TENTATIVAS) {
          if (telRem) {
            try {
              await sendSms(
                telRem,
                `Olá ${senderName},\n` +
                `não conseguimos entregar sua mensagem após ${MAX_TENTATIVAS} tentativas.`
              );
            } catch (_) {}
          }

          update.falha_definitiva = true;
          update.enviado = false;
        }

        await ref.update(update);

        console.log(`Falha ${novoTotal}/${MAX_TENTATIVAS}: ${doc.id}`);
      }
    }

  } catch (e) {
    console.error("Runner error:", e);
  }
}

run();
