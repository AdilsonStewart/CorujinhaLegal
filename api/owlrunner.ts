// Vercel HTTP handler (TypeScript) - coloque em api/owlrunner.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { DateTime } from 'luxon';
import { initFirebase } from './lib/firestore';
import { getSupabaseSignedUrl } from './lib/supabase';
import { sendMessageClickSend } from './lib/clicksend';
import crypto from 'crypto';

initFirebase(); // initialize firebase-admin

const ALLOWED_HOURS = ['08:00','10:00','12:00','14:00','16:00','18:00'];
const TIMEZONE = process.env.TIMEZONE || 'America/Sao_Paulo';
const RUNNER_SECRET = process.env.RUNNER_SECRET || '';

function verifySecret(req: VercelRequest) {
  const header = (req.headers['x-runner-secret'] || '') as string;
  const a = Buffer.from(header);
  const b = Buffer.from(RUNNER_SECRET);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function nowDateString() {
  return DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifySecret(req)) {
    return res.status(401).json({ error: 'invalid secret' });
  }

  const hourParam = (req.query.hour as string) || DateTime.now().setZone(TIMEZONE).toFormat('HH:mm');
  const scheduledHour = hourParam.length === 5 ? hourParam : hourParam.slice(0,5);

  if (!ALLOWED_HOURS.includes(scheduledHour)) {
    return res.status(400).json({ error: 'hour not allowed', allowed: ALLOWED_HOURS });
  }

  const today = nowDateString();
  const db = admin.firestore();

  try {
    const q = db.collection('agendamentos')
      .where('data_agendada','==', today)
      .where('hora_agendada','==', scheduledHour)
      .where('status','in',['pendente','tentativa_2','tentativa_3']);

    const snapshot = await q.get();
    if (snapshot.empty) {
      return res.status(200).json({ processed: 0, message: 'no agendamentos for this slot' });
    }

    const runId = `owlRunner-${DateTime.now().setZone(TIMEZONE).toISO()}`;
    const results: Array<{ id: string; status: string; info?: any }> = [];

    for (const doc of snapshot.docs) {
      const agendamentoRef = doc.ref;
      const agData = doc.data();

      // Transactional lock + create attempt
      const lockOk = await db.runTransaction(async tx => {
        const fresh = await tx.get(agendamentoRef);
        if (!fresh.exists) return false;
        const data = fresh.data();
        if (!data) return false;
        if (!['pendente','tentativa_2','tentativa_3'].includes(data.status)) return false;
        if (data.processing_run) return false;

        const statusToAttempt: any = { 'pendente': 1, 'tentativa_2': 2, 'tentativa_3': 3 };
        const nextAttempt = statusToAttempt[data.status] || 1;

        tx.update(agendamentoRef, {
          processing_run: runId,
          processing_attempt: nextAttempt,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        const attemptRef = agendamentoRef.collection('tentativas').doc(String(nextAttempt));
        tx.set(attemptRef, {
          tentativa: nextAttempt,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          resultado: 'in_progress',
          run_id: runId
        });

        return true;
      });

      if (!lockOk) {
        results.push({ id: doc.id, status: 'skipped_locked_or_ineligible' });
        continue;
      }

      try {
        const audioPath = agData.audio_path as string;
        const signedUrl = audioPath ? await getSupabaseSignedUrl(audioPath) : null;

        const senderName = (agData.remetente && agData.remetente.nome) ? agData.remetente.nome : 'Alguém';
        const messageText = `Olá, você está recebendo uma mensagem especial de ${senderName}.\nClique neste link para ver: ${signedUrl || ''}`;

        const clickResp = await sendMessageClickSend({
          to: agData.telefone,
          body: messageText
        });

        if (clickResp.ok) {
          const attemptNum = (agData.processing_attempt) || 1;
          const attemptRef = agendamentoRef.collection('tentativas').doc(String(attemptNum));
          await attemptRef.update({
            resultado: 'sucesso',
            motivo: null,
            clicksend_response: clickResp.raw || clickResp.data || {},
            finished_at: admin.firestore.FieldValue.serverTimestamp()
          });

          await agendamentoRef.update({
            status: 'enviado',
            enviado_em: admin.firestore.FieldValue.serverTimestamp(),
            processing_run: admin.firestore.FieldValue.delete(),
            processing_attempt: admin.firestore.FieldValue.delete(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });

          results.push({ id: doc.id, status: 'enviado', info: clickResp });
        } else {
          const attemptNum = (agData.processing_attempt) || 1;
          const attemptRef = agendamentoRef.collection('tentativas').doc(String(attemptNum));
          const reason = clickResp.error || 'unknown_failure';

          await attemptRef.update({
            resultado: 'falha',
            motivo: reason,
            clicksend_response: clickResp.raw || clickResp.data || {},
            finished_at: admin.firestore.FieldValue.serverTimestamp()
          });

          const newStatus = agData.status === 'pendente' ? 'tentativa_2'
            : agData.status === 'tentativa_2' ? 'tentativa_3'
            : 'cancelado';

          const updates: any = {
            status: newStatus,
            processing_run: admin.firestore.FieldValue.delete(),
            processing_attempt: admin.firestore.FieldValue.delete(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          };

          if (newStatus === 'cancelado') {
            updates.cancelado_motivo = reason;
          }

          await agendamentoRef.update(updates);

          results.push({ id: doc.id, status: newStatus, reason });
        }
      } catch (err) {
        console.error('send-error', doc.id, err);
        try {
          const agSnap = await agendamentoRef.get();
          const agDataFresh = agSnap.data() || {};
          const attemptNum = agDataFresh.processing_attempt || 1;
          const attemptRef = agendamentoRef.collection('tentativas').doc(String(attemptNum));
          await attemptRef.update({
            resultado: 'falha',
            motivo: String(err.message || err),
            finished_at: admin.firestore.FieldValue.serverTimestamp()
          });

          const newStatus = agDataFresh.status === 'pendente' ? 'tentativa_2'
            : agDataFresh.status === 'tentativa_2' ? 'tentativa_3'
            : 'cancelado';

          const updates: any = {
            status: newStatus,
            processing_run: admin.firestore.FieldValue.delete(),
            processing_attempt: admin.firestore.FieldValue.delete(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          };
          if (newStatus === 'cancelado') updates.cancelado_motivo = String(err.message || err);

          await agendamentoRef.update(updates);
          results.push({ id: doc.id, status: newStatus, reason: String(err) });
        } catch (inner) {
          console.error('error-cleanup', doc.id, inner);
          results.push({ id: doc.id, status: 'error_cleanup_failed', error: String(inner) });
        }
      }
    }

    return res.status(200).json({ processed: results.length, results });
  } catch (e) {
    console.error('runner-error', e);
    return res.status(500).json({ error: 'internal_error', details: String(e) });
  }
}
