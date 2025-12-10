import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURAÇÃO SUPABASE (BACKEND)
const supabaseUrl = process.env.SUPABASE_URL || 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'SUA_CHAVE_SERVICE_ROLE_AQUI';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 🔒 CORS
  const allowedOrigins = [
    'https://corujinha-legal.vercel.app',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, paypal-*');
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
    console.log('=== 🦉 WEBHOOK INICIADO ===');
    console.log('📦 Headers recebidos:', JSON.stringify(req.headers));
    console.log('📦 Body recebido:', JSON.stringify(req.body));
    
    // 🔍 DETECTAR QUEM ESTÁ ENVIANDO
    const isFromPayPal = req.headers['paypal-transmission-id'] || 
                         req.body.event_type?.includes('PAYMENT') ||
                         req.body.event_type?.includes('CHECKOUT');
    
    let dadosParaSalvar;
    
    if (isFromPayPal) {
      // 📥 MENSAGEM DO PAYPAL REAL
      console.log('💰 PAYPAL REAL DETECTADO! Evento:', req.body.event_type);
      
      // EXTRAIR orderID DO custom_id (QUE É O SEU orderID)
      const orderID = req.body.resource?.purchase_units?.[0]?.custom_id || 
                     req.body.resource?.custom_id || 
                     `PAYPAL-${Date.now()}`;
      
      // DETERMINAR TIPO PELO VALOR
      const valorStr = req.body.resource?.purchase_units?.[0]?.amount?.value || 
                      req.body.resource?.amount?.value || '0';
      const valor = parseFloat(valorStr);
      const tipo = valor === 5 ? 'audio' : valor === 10 ? 'video' : 'desconhecido';
      
      dadosParaSalvar = {
        tipo: tipo,
        order_id: orderID,
        status: 'pago', // Status específico para pagamento confirmado
        origem: 'paypal',
        evento_paypal: req.body.event_type,
        valor: valor,
        dados_completos: req.body, // Salva tudo para debug
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      console.log(`✅ Dados PayPal convertidos: ${orderID} - ${tipo} - R$${valor}`);
      
    } else {
      // 📥 MENSAGEM DO SEU FRONTEND (gravação)
      console.log('🎬 FRONTEND DETECTADO (gravação)');
      
      const { tipo, orderID, status, destinatario, data, hora, telefone, link_midia } = req.body;
      
      if (!orderID || !tipo || !destinatario || !telefone || !data || !hora) {
        console.error('❌ Dados incompletos do frontend');
        return res.status(400).json({ 
          error: 'Dados incompletos do frontend',
          recebido: req.body
        });
      }
      
      dadosParaSalvar = {
        tipo,
        order_id: orderID,
        status: status || 'pendente',
        destinatario,
        telefone,
        data_agendamento: data,
        hora_agendamento: hora,
        link_midia: link_midia || '',
        enviado: false,
        origem: 'frontend',
        criado_em: new Date().toISOString()
      };
    }
    
    // 🗃️ SALVAR NO BANCO
    console.log('💾 Salvando no banco:', dadosParaSalvar);
    
    const { data: resultado, error } = await supabase
      .from('agendamentos')
      .insert([dadosParaSalvar])
      .select();
    
    if (error) {
      console.error('❌ Erro ao salvar:', error);
      return res.status(500).json({ 
        error: 'Erro no banco de dados',
        details: error.message 
      });
    }
    
    console.log(`✅ SUCESSO! Salvo com ID: ${resultado[0]?.id}`);
    
    // 📤 RESPONDER CONFORME A ORIGEM
    if (isFromPayPal) {
      // PayPal exige 200 OK rapidamente
      return res.status(200).json({ 
        status: 'RECEIVED',
        message: 'Evento PayPal processado',
        order_id: dadosParaSalvar.order_id
      });
    } else {
      // Seu frontend espera esta resposta
      return res.status(200).json({ 
        success: true, 
        message: 'Agendamento registrado!',
        agendamento: resultado[0],
        orderID: dadosParaSalvar.order_id
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
    return res.status(500).json({ 
      error: 'Erro interno',
      message: error.message 
    });
  }
}
