// api/owlrunner_dry.js
// Versão JS simples do dry-run (não usa Firebase/Supabase/ClickSend)

const fs = require('fs');
const path = require('path');

const RUNNER_SECRET = process.env.RUNNER_SECRET || 'change-me';
const ALLOWED_HOURS = ['08:00','10:00','12:00','14:00','16:00','18:00'];

function verifySecret(header) {
  if (!header) return false;
  return header === RUNNER_SECRET;
}

module.exports = (req, res) => {
  if (!verifySecret(req.headers['x-runner-secret'])) {
    return res.status(401).json({ error: 'invalid secret' });
  }

  const hourParam = (req.query.hour || '08:00').toString().slice(0,5);
  if (!ALLOWED_HOURS.includes(hourParam)) {
    return res.status(400).json({ error: 'hour not allowed', allowed: ALLOWED_HOURS });
  }

  try {
    const filePath = path.join(process.cwd(), 'test_data', 'test_agendamentos.json');
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'test data file not found', path: filePath });
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const all = JSON.parse(raw);

    const today = new Date().toISOString().slice(0,10);
    const matches = all.filter(item =>
      item.data_agendada === today && item.hora_agendada === hourParam && ['pendente','tentativa_2','tentativa_3'].includes(item.status)
    );

    const results = matches.map(doc => ({
      id: doc.id || '(local)',
      status: doc.status,
      telefone: doc.telefone,
      audio_path: doc.audio_path,
      remetente: doc.remetente,
      note: 'dry-run: não enviou nada'
    }));

    return res.status(200).json({ processed: results.length, results });
  } catch (err) {
    return res.status(500).json({ error: 'failed_reading_test_data', details: String(err) });
  }
};
