// api/paypal-webhook.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { tipo, orderID, status, destinatario, data, hora } = req.body;
    
    // 1. Salvar no Supabase
    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .insert([
        {
          tipo,
          order_id: orderID,
          status,
          destinatario,
          data_agendamento: data,
          hora_agendamento: hora,
          criado_em: new Date().toISOString()
        }
      ]);

    if (error) throw error;

    // 2. Aqui depois vamos disparar para o ClikSend
    console.log(`Agendamento salvo: ${orderID} - ${tipo} para ${destinatario}`);

    res.status(200).json({ success: true, agendamento });
    
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}
