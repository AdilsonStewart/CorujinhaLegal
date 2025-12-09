// api/paypal-webhook.js - VERSÃO CORRIGIDA E SEGURA
import { createClient } from '@supabase/supabase-js';

// ⚠️ MOVA AS CHAVES PARA VARIÁVEIS DE AMBIENTE (ver PASSO 2)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 🔵 1. ADICIONAR CORS HEADERS
  // Permite apenas seu domínio (ajuste se tiver localhost também)
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
  
  // 2. LIDAR COM PREFLIGHT (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 3. SÓ ACEITA POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { tipo, orderID, status, destinatario, data, hora, telefone } = req.body;
    
    console.log('📥 Dados recebidos:', { tipo, orderID, status, destinatario, data, hora, telefone });

    // Validar dados obrigatórios
    if (!orderID || !tipo || !destinatario || !telefone || !data || !hora) {
      console.error('❌ Dados incompletos:', req.body);
      return res.status(400).json({ 
        error: 'Dados incompletos',
        required: ['orderID', 'tipo', 'destinatario', 'telefone', 'data', 'hora']
      });
    }

    // 4. Salvar no Supabase
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
          link_midia: '', // Vazio por enquanto
          enviado: false,
          criado_em: new Date().toISOString()
        }
      ])
      .select(); // ⬅️ Retorna o registro inserido

    if (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar no banco de dados', 
        details: error.message 
      });
    }

    console.log(`✅ Agendamento salvo: ${orderID} - ${tipo} para ${destinatario}`);
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
