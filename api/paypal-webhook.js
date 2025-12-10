const { createClient } = require('@supabase/supabase-js');

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'sua-service-key-aqui';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  console.log('=== WEBHOOK CHAMADO ===');
  
  try {
    // 📦 VERIFICAR SE É PAYPAL
    const isPayPal = req.body.event_type && req.body.resource;
    
    if (isPayPal) {
      console.log('💰 PAYPAL DETECTADO');
      console.log('Evento:', req.body.event_type);
      
      // DADOS DO PAYPAL
      const paypalData = req.body.resource;
      const purchaseUnit = paypalData.purchase_units?.[0] || {};
      
      // EXTRAIR orderID (custom_id que você enviou)
      const orderID = purchaseUnit.custom_id || `PAYPAL-${Date.now()}`;
      
      // EXTRAIR VALOR
      const valorStr = purchaseUnit.amount?.value || '0';
      const valor = parseFloat(valorStr);
      
      // DETERMINAR TIPO PELO VALOR
      const tipo = valor === 5 ? 'audio' : valor === 10 ? 'video' : 'desconhecido';
      
      console.log(`📊 Pagamento: ${orderID} - ${tipo} - R$${valor}`);
      
      // 🗃️ SALVAR NO BANCO (APENAS DADOS BÁSICOS)
      const dadosParaSalvar = {
        tipo: tipo,
        order_id: orderID,
        status: 'pago',  // Pagamento confirmado
        valor: valor,
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      console.log('💾 Salvando:', dadosParaSalvar);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ Erro banco:', error);
        // MAS RESPONDE 200 PARA PAYPAL NÃO REENVIAR!
        return res.status(200).json({ status: 'RECEIVED_BUT_DB_ERROR' });
      }
      
      console.log('✅ PayPal salvo no banco!');
      
      // ⚠️ IMPORTANTE: PayPal exige 200 OK RÁPIDO!
      return res.status(200).json({ 
        status: 'RECEIVED',
        message: 'Pagamento processado'
      });
      
    } else {
      // 🎬 É SEU FRONTEND (gravação)
      console.log('🎬 FRONTEND DETECTADO');
      
      const { tipo, orderID, status, destinatario, data, hora, telefone, link_midia } = req.body;
      
      // Validar dados do frontend
      if (!orderID || !tipo || !destinatario || !telefone || !data || !hora) {
        console.error('❌ Dados incompletos frontend:', req.body);
        return res.status(400).json({ 
          error: 'Dados incompletos do frontend'
        });
      }
      
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
      
      console.log('💾 Salvando frontend:', dadosParaSalvar);
      
      const { data: resultado, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ Erro frontend:', error);
        return res.status(500).json({ error: 'Erro banco' });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Agendamento salvo!',
        agendamento: resultado[0]
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    // ⚠️ SEMPRE RESPONDE 200 PARA PAYPAL!
    return res.status(200).json({ status: 'RECEIVED_BUT_ERROR' });
  }
};
