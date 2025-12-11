const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  console.log('=== WEBHOOK CHAMADO ===');
  
  try {
    // VERIFICAR SE É PAYPAL
    const isPayPal = req.body.event_type && req.body.resource;
    
    if (isPayPal) {
      console.log('💰 PAYPAL DETECTADO!');
      
      // CÓDIGO DO PAYPAL (mantenha o SEU código atual aqui)
      // NÃO MEXA NESTA PARTE SE JÁ ESTIVER FUNCIONANDO
      
      return res.status(200).json({ status: 'RECEIVED' });
      
    } else {
      // FRONTEND APÓS PAGAMENTO (dados simples)
      console.log('🔄 FRONTEND DETECTADO (após pagamento)');
      
      const { tipo, orderID, status } = req.body;
      
      // VALIDAÇÃO SIMPLES
      if (!tipo || !orderID || !status) {
        console.error('❌ Dados mínimos não recebidos');
        return res.status(400).json({ 
          success: false,
          error: 'Envie: tipo, orderID, status' 
        });
      }
      
      console.log(`✅ Pagamento confirmado: ${orderID} - ${tipo}`);
      
      // SALVAR NO BANCO
      const dadosParaSalvar = {
        tipo: tipo,
        order_id: orderID,
        status: status,
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      const { data, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ Erro no banco:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao salvar' 
        });
      }
      
      console.log('✅ Pagamento salvo no banco!');
      
      return res.status(200).json({ 
        success: true, 
        message: 'Pagamento confirmado!',
        orderID: orderID
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno' 
    });
  }
};
