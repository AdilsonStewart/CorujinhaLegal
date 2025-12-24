// FORÇA REBUILD FINAL - TWILIO CORRETO 24/12/2025
// owlrunner.js – versão Twilio + mensagem 100% pessoal (sem emoji, sem "PARAR")
const admin = require("firebase-admin");
const twilio = require("twilio");

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

// Credenciais Twilio (já configuradas na Render)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

function normalizePhone(raw) {
  if (!raw) return null;
  let d = raw.toString().replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 13) return `+${d}`;
  if (d.length === 11) return `+55${d}`;
  if (raw.startsWith("+55")) return raw;
  return `+${d}`;
}

async function sendSms(to, body) {
  return twilioClient.messages.create({
    body: body,
    from: FROM_NUMBER,
    to: to
  });
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
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !FROM_NUMBER) {
    console.error("Credenciais da Twilio não encontradas nas environment variables");
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
      console.log("Nenhuma mensagem pendente para hoje");
      return;
    }

    for (const doc of snap.docs) {
      const ref = doc.ref;
      const d = doc.data();
      const horaAgendada = d.hora_agendamento;

      if (!horaAgendada || horaAgendada > currentHour) {
        continue;
      }

      const tent = d.tentativas_total || 0;
      const destName = d.destinatario || "Amigo";
      const senderName = d.remetente || "Alguém";
      const telDest = normalizePhone(d.telefone_destinatario || d.telefone);
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

      // Mensagem 100% pessoal e natural
      const body = `Olá ${destName},\n\n` +
                   `${senderName} te enviou uma mensagem especial.\n\n` +
                   `Clique no link para ouvir ou ver:\n${url}`;

      try {
        const message = await sendSms(telDest, body);
        await ref.update({
          enviado: true,
          enviado_em: admin.firestore.FieldValue.serverTimestamp(),
          tentativas_total: tent,
          ultimo_erro: null,
          twilio_sid: message.sid
        });
        console.log(`Sucesso Twilio: ${doc.id} | SID: ${message.sid}`);
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
                `não conseguimos entregar sua mensagem após ${MAX_TENTATIVAS} tentativas. ` +
                `Verifique o número ou entre em contato.`
              );
            } catch (_) {}
          }
          update.falha_definitiva = true;
          update.enviado = false;
        }

        await ref.update(update);
        console.log(`Falha ${novoTotal}/${MAX_TENTATIVAS}: ${doc.id} | Erro: ${err.message}`);
      }
    }
  } catch (e) {
    console.error("Erro geral no runner:", e);
  }
}

run();

