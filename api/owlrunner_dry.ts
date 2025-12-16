import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Dry-run runner: NÃO usa Firebase/Supabase/ClickSend.
// Apenas valida o header x-runner-secret e filtra um JSON local com agendamentos.

const RUNNER_SECRET = process.env.RUNNER_SECRET || 'change-me';
const ALLOWED_HOURS = ['08:00','10:00','12:00','14:00','16:00','18:00'];

function verifySecret(header: string | undefined) {
  const a = Buffer.from(header || '');
  const b = Buffer.from(RUNNER_SECRET);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifySecret(req.headers['x-runner-secret'] as string | undefined)) {
    return res.status(401).json({ error: 'invalid secret' });
  }

  const hourParam = (req.query.hour as string) || '08:00';
  const scheduledHour = hourParam.length === 5 ? hourParam : hourParam.slice(0,5);

  if (!ALLOWED_HOURS.includes(scheduledHour)) {
    return res.status(400).json({ error: 'hour not allowed', allowed: ALLOWED_HOURS });
  }

  // lê arquivo local test_data/test_agendamentos.json
  try {
    const filePath = path.join(process.cwd(), 'test_data', 'test_agendamentos.json');
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'test data file not found', path: filePath });
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const all: any[] = JSON.parse(raw);

    const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD (local dev)
    // Filtra por data_agendada igual a today e hora_agendada igual a scheduledHour
    const matches = all.filter(item =>
      item.data_agendada === today && item.hora_agendada === scheduledHour && ['pendente','tentativa_2','tentativa_3'].includes(item.status)
    );

    // Simula processamento (não altera nada, só relata)
    const results = matches.map(doc => ({
      id: doc.id || '(local)',
      status: doc.status,
      telefone: doc.telefone,
      audio_path: doc.audio_path,
      remetente: doc.remetente,
      note: 'dry-run: não enviou nada'
    }));

    return res.status(200).json({ processed: results.length, results });
  } catch (err: any) {
    return res.status(500).json({ error: 'failed_reading_test_data', details: String(err) });
  }
}
