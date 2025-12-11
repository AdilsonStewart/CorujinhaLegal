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
      
      // 🎯 LOG COMPLETO PARA DEBUG
      console.log('📦 TODOS OS DADOS RECEBIDOS:', JSON.stringify(req.body, null, 2));
      
      // 🎯 PEGA OS CAMPOS BÁSICOS
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
      
      // 🎯 DADOS BÁSICOS (MANTÉM ESTRUTURA ORIGINAL)
      const dadosParaSalvar = {
        tipo: tipo,
        order_id: orderID,
        status: status,
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      // 🎯 DADOS DO DESTINATÁRIO (FORMULÁRIO)
      if (req.body.destinatario) {
        dadosParaSalvar.destinatario = req.body.destinatario;
        console.log('👤 Destinatário recebido:', req.body.destinatario);
      }
      
      if (req.body.telefone) {
        dadosParaSalvar.telefone = req.body.telefone.replace(/\D/g, '');
        console.log('📞 Telefone destinatário:', req.body.telefone);
      }
      
      if (req.body.data) {
        dadosParaSalvar.data_agendamento = req.body.data;
        console.log('📅 Data agendamento:', req.body.data);
      }
      
      if (req.body.hora) {
        dadosParaSalvar.hora_agendamento = req.body.hora;
        console.log('🕒 Hora agendamento:', req.body.hora);
      }
      
      if (req.body.link_midia) {
        dadosParaSalvar.link_midia = req.body.link_midia;
        console.log('🔗 Link mídia:', req.body.link_midia);
      }
      
      // 🎯 NOVO: DADOS DO REMETENTE (CLIENTE)
      if (req.body.clienteNome) {
        dadosParaSalvar.remetente_nome = req.body.clienteNome;
        console.log('👤 Remetente nome:', req.body.clienteNome);
      }
      
      if (req.body.clienteTelefone) {
        dadosParaSalvar.remetente_telefone = req.body.clienteTelefone.replace(/\D/g, '');
        console.log('📞 Remetente telefone:', req.body.clienteTelefone);
      }
      
      if (req.body.clienteId) {
        dadosParaSalvar.cliente_id = req.body.clienteId;
        console.log('🆔 Cliente ID:', req.body.clienteId);
      }
      
      console.log('💾 DADOS COMPLETOS PARA SALVAR:');
      console.log(JSON.stringify(dadosParaSalvar, null, 2));
      
      // 🎯 SALVAR NO BANCO
      const { data, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();
      
      if (error) {
        console.error('❌ Erro no banco:', error);
        console.error('Detalhes:', JSON.stringify(error, null, 2));
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao salvar no banco' 
        });
      }
      
      console.log('✅ REGISTRO SALVO COM SUCESSO!');
      console.log('📊 ID:', data[0]?.id);
      console.log('🆔 Order ID:', data[0]?.order_id);
      console.log('👤 Remetente:', data[0]?.remetente_nome);
      console.log('📞 Tel. Remetente:', data[0]?.remetente_telefone);
      console.log('👥 Destinatário:', data[0]?.destinatario);
      console.log('📅 Data:', data[0]?.data_agendamento);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Pagamento confirmado e dados salvos!',
        orderID: orderID,
        registro: data[0]
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno no servidor' 
    });
  }
};
