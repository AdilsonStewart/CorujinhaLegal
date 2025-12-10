const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'SUA_SERVICE_KEY_AQUI';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  console.log('=== WEBHOOK CHAMADO ===');
  
  try {
    // 📦 VERIFICAR SE É PAYPAL (formato específico do PayPal)
    const isPayPal = req.body.event_type && req.body.resource;
    
    if (isPayPal) {
      console.log('💰 PAYPAL DETECTADO!');
      console.log('Evento:', req.body.event_type);
      
      // EXTRAIR DADOS DO PAYPAL
      const paypalData = req.body.resource;
      const purchaseUnit = paypalData.purchase_units?.[0] || {};
      
      // 🎯 EXTRAIR custom_id (SEU orderID)
      const orderID = purchaseUnit.custom_id || `PAYPAL-${Date.now()}`;
      
      // EXTRAIR VALOR
      const valor = parseFloat(purchaseUnit.amount?.value || '0');
      const tipo = valor === 5 ? 'audio' : valor === 10 ? 'video' : 'desconhecido';
      
      console.log(`📊 Pagamento detectado: ${orderID} - ${tipo} - R$${valor}`);
      
      // 🗃️ SALVAR NO BANCO
      const dadosParaSalvar = {
        tipo: tipo,
        order_id: orderID,
        status: 'pago',
        valor: valor,
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      console.log('💾 Salvando no banco:', dadosParaSalvar);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ Erro no banco:', error);
        // ⚠️ MAS RESPONDE 200 PARA PAYPAL!
        return res.status(200).json({ status: 'RECEIVED' });
      }
      
      console.log('✅ PayPal salvo no banco! ID:', data[0]?.id);
      
      // 📤 RESPOSTA PARA PAYPAL (200 OK!)
      return res.status(200).json({ 
        status: 'RECEIVED',
        message: 'Pagamento processado com sucesso'
      });
      
    } else {
      // 🎬 É SEU FRONTEND (gravação) - FORMULÁRIO DE AGENDAMENTO
      console.log('🎬 FRONTEND DETECTADO (formulário de agendamento)');
      
      const { tipo, orderID, destinatario, telefone, data, hora } = req.body;
      
      console.log('📥 Dados recebidos do frontend:', req.body);
      
      // VERIFICA SE VEIO O status, mas não obriga (alguns podem não enviar)
      const statusRecebido = req.body.status || 'pago';
      
      // VALIDAÇÃO: Campos obrigatórios
      if (!orderID || !tipo || !destinatario || !telefone || !data || !hora) {
        console.error('❌ Dados incompletos do frontend:', { orderID, tipo, destinatario, telefone, data, hora });
        return res.status(400).json({ 
          success: false,
          error: 'Dados incompletos. Envie: tipo, orderID, destinatario, telefone, data, hora' 
        });
      }
      
      const dadosParaSalvar = {
        tipo,
        order_id: orderID,
        status: statusRecebido,
        destinatario,
        telefone,
        data_agendamento: data,
        hora_agendamento: hora,
        link_midia: '',
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
        return res.status(500).json({ 
          success: false,
          error: 'Erro no banco de dados' 
        });
      }
      
      // ⚠️ IMPORTANTE: Retorna com 'success: true' que seu frontend espera
      return res.status(200).json({ 
        success: true, 
        message: 'Agendamento salvo com sucesso!',
        agendamento: resultado[0]
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    // ⚠️ SEMPRE 200 PARA PAYPAL!
    return res.status(200).json({ status: 'RECEIVED' });
  }
};
