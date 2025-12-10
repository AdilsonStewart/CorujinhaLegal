// paypal-webhook.js - VERSÃO FINAL FUNCIONAL
const { createClient } = require('@supabase/supabase-js');

// 🔧 CONFIGURAÇÃO SUPABASE
const supabaseUrl = process.env.SUPABASE_URL || 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'sua-service-key-aqui';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // 🔒 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, paypal-*');
  
  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('=== 🦉 WEBHOOK PAYPAL INICIADO ===');
    
    // 🔍 DETECTAR SE É PAYPAL
    const paypalSignature = req.headers['paypal-transmission-id'];
    const isFromPayPal = paypalSignature || req.body.event_type?.includes('PAYMENT');
    
    if (isFromPayPal) {
      console.log('💰 MENSAGEM DO PAYPAL RECEBIDA');
      console.log('Evento:', req.body.event_type);
      
      // 📦 EXTRAIR DADOS DO PAYPAL
      const purchaseUnit = req.body.resource?.purchase_units?.[0] || {};
      const orderID = purchaseUnit.custom_id || `PAYPAL-${Date.now()}`;
      const valor = parseFloat(purchaseUnit.amount?.value || '0');
      const tipo = valor === 5 ? 'audio' : valor === 10 ? 'video' : 'desconhecido';
      
      console.log(`📊 Dados extraídos: ${orderID} - ${tipo} - R$${valor}`);
      
      // 🗃️ DADOS PARA SALVAR (APENAS CAMPOS QUE EXISTEM)
      const dadosParaSalvar = {
        tipo: tipo,
        order_id: orderID,
        status: 'pago',           // Já existe na tabela
        valor: valor,             // PRECISA existir na tabela
        criado_em: new Date().toISOString(),
        enviado: false,
        // Campos OPCIONAIS (se não existirem, comente ou remova):
        // origem: 'paypal',
        // dados_completos: req.body,
        // evento_paypal: req.body.event_type
      };
      
      // 💾 SALVAR NO BANCO
      console.log('💾 Tentando salvar:', dadosParaSalvar);
      
      const { data: resultado, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ ERRO NO BANCO:', error);
        return res.status(500).json({ 
          error: 'Erro ao salvar no banco',
          details: error.message,
          suggestion: 'Verifique se todos os campos existem na tabela agendamentos'
        });
      }
      
      console.log('✅ PayPal processado com sucesso! ID:', resultado[0]?.id);
      
      // 📤 RESPOSTA PARA PAYPAL (IMPORTANTE: 200 OK rápido)
      return res.status(200).json({ 
        status: 'RECEIVED',
        message: 'Evento PayPal processado',
        order_id: orderID
      });
      
    } else {
      // 🎬 MENSAGEM DO SEU FRONTEND (gravação)
      console.log('🎬 MENSAGEM DO FRONTEND (gravação)');
      
      const { tipo, orderID, status, destinatario, data, hora, telefone, link_midia } = req.body;
      
      // ✅ VALIDAR DADOS
      if (!orderID || !tipo || !destinatario || !telefone || !data || !hora) {
        console.error('❌ Dados incompletos do frontend:', req.body);
        return res.status(400).json({ 
          error: 'Dados incompletos',
          required: ['orderID', 'tipo', 'destinatario', 'telefone', 'data', 'hora'],
          received: req.body
        });
      }
      
      // 🗃️ DADOS DO FRONTEND
      const dadosParaSalvar = {
        tipo,
        order_id: orderID,
        status: status || 'pendente',
        destinatario,
        telefone,
        data_agendamento: data,
        hora_agendamento: hora,
        link_midia: link_midia || '',
        enviado: false,
        criado_em: new Date().toISOString()
      };
      
      console.log('💾 Salvando agendamento do frontend:', dadosParaSalvar);
      
      const { data: resultado, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ Erro ao salvar frontend:', error);
        return res.status(500).json({ 
          error: 'Erro no banco de dados',
          details: error.message
        });
      }
      
      console.log('✅ Frontend salvo com sucesso!');
      
      return res.status(200).json({ 
        success: true, 
        message: 'Agendamento registrado!',
        agendamento: resultado[0],
        orderID: orderID
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO NO WEBHOOK:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};
