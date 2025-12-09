// api/paypal-webhook.js
import { createClient } from '@supabase/supabase-js';

// 🔧 USE SUAS CREDENCIAIS AQUI (as que você me passou)
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { tipo, orderID, status, destinatario, data, hora, telefone } = req.body;
    
    console.log('📥 Dados recebidos:', { tipo, orderID, status, destinatario, data, hora, telefone });

    // 1. Salvar no Supabase
    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .insert([
        {
          tipo,
          order_id: orderID,
          status,
          destinatario: destinatario || 'Não informado',
          telefone: telefone || 'Não informado',
          data_agendamento: data,
          hora_agendamento: hora,
          link_midia: '', // Vazio por enquanto
          enviado: false  // Ainda não enviado por SMS
          // Não inclua 'criado_em' - já tem valor padrão NOW()
        }
      ]);

    if (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar no banco de dados', 
        details: error.message 
      });
    }

    console.log(`✅ Agendamento salvo: ${orderID} - ${tipo} para ${destinatario}`);

    res.status(200).json({ 
      success: true, 
      message: 'Agendamento registrado com sucesso!',
      agendamento,
      orderID 
    });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}
