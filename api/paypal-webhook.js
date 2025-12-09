// api/paypal-webhook.js - VERSÃO FINAL COM LINK DA MÍDIA
import { createClient } from '@supabase/supabase-js';

// ✅ Variáveis de ambiente do Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS
  const allowedOrigins = [
    'https://corujinha-legal.vercel.app',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 🔥 AGORA PEGA O link_midia TAMBÉM!
    const { tipo, orderID, status, destinatario, data, hora, telefone, link_midia } = req.body;
    
    console.log('📥 Dados recebidos:', { 
      tipo, orderID, status, destinatario, data, hora, telefone,
      temLinkMidia: !!link_midia // Mostra se veio link
    });

    // Validar dados obrigatórios
    if (!orderID || !tipo || !destinatario || !telefone || !data || !hora) {
      console.error('❌ Dados incompletos:', req.body);
      return res.status(400).json({ 
        error: 'Dados incompletos',
        required: ['orderID', 'tipo', 'destinatario', 'telefone', 'data', 'hora']
      });
    }

    // Salvar no Supabase COM O LINK DA MÍDIA
    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .insert([
        {
          tipo,
          order_id: orderID,
          status: status || 'pending',
          destinatario,
          telefone,
          data_agendamento: data,
          hora_agendamento: hora,
          link_midia: link_midia || '', // 🔥 AQUI MUDOU! Pega do frontend
          enviado: false,
          criado_em: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar no banco de dados', 
        details: error.message 
      });
    }

    console.log(`✅ Agendamento salvo: ${orderID} - ${tipo} para ${destinatario}`);
    console.log('🔗 Link da mídia salvo:', link_midia || '(sem link)');
    console.log('📊 Registro inserido:', agendamento);

    return res.status(200).json({ 
      success: true, 
      message: 'Agendamento registrado com sucesso!',
      agendamento: agendamento[0],
      orderID 
    });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}
