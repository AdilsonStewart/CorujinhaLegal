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
      // Seu código PayPal aqui (não mude)
      return res.status(200).json({ status: 'RECEIVED' });
      
    } else {
      console.log('🔄 FRONTEND DETECTADO (após pagamento)');
      
      // 🎯 PEGA APENAS OS 3 CAMPOS QUE O ANTIGO USA
      const { tipo, orderID, status } = req.body;
      
      // VALIDAÇÃO SIMPLES (igual ao antigo)
      if (!tipo || !orderID || !status) {
        console.error('❌ Dados mínimos não recebidos');
        return res.status(400).json({ 
          success: false,
          error: 'Envie: tipo, orderID, status' 
        });
      }
      
      console.log(`✅ Pagamento confirmado: ${orderID} - ${tipo}`);
      
      // 🎯 DADOS BÁSICOS (IGUAL AO ANTIGO)
      const dadosParaSalvar = {
        tipo: tipo,
        order_id: orderID,
        status: status,
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      // 🎯 SE TIVER DADOS DO FORMULÁRIO, ADICIONA
      if (req.body.destinatario) {
        dadosParaSalvar.destinatario = req.body.destinatario;
        console.log('👤 Destinatário recebido:', req.body.destinatario);
      }
      
      if (req.body.telefone) {
        dadosParaSalvar.telefone = req.body.telefone.replace(/\D/g, '');
        console.log('📞 Telefone recebido:', req.body.telefone);
      }
      
      if (req.body.data) {
        dadosParaSalvar.data_agendamento = req.body.data;
        console.log('📅 Data recebida:', req.body.data);
      }
      
      if (req.body.hora) {
        dadosParaSalvar.hora_agendamento = req.body.hora;
        console.log('🕒 Hora recebida:', req.body.hora);
      }
      
      if (req.body.link_midia) {
        dadosParaSalvar.link_midia = req.body.link_midia;
        console.log('🔗 Link mídia recebido:', req.body.link_midia);
      }
      
      console.log('💾 Dados para salvar:', dadosParaSalvar);
      
      // 🎯 SALVAR NO BANCO (SIMPLES COMO ANTIGO)
      const { data, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ Erro no banco:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao salvar no banco' 
        });
      }
      
      console.log('✅ Registro salvo no banco!');
      console.log('📊 ID:', data[0]?.id);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Pagamento confirmado e dados salvos!',
        orderID: orderID
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno no servidor' 
    });
  }
};
