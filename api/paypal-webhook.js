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
      console.log('🔄 FRONTEND DETECTADO (após pagamento)');
      
      // 🎯 LOG COMPLETO DO QUE ESTÁ RECEBENDO
      console.log('📦 DADOS RECEBIDOS DO FRONTEND:');
      console.log('- tipo:', req.body.tipo);
      console.log('- orderID:', req.body.orderID);
      console.log('- status:', req.body.status);
      console.log('- destinatario:', req.body.destinatario);
      console.log('- telefone:', req.body.telefone);
      console.log('- data:', req.body.data);
      console.log('- hora:', req.body.hora);
      console.log('- link_midia:', req.body.link_midia);
      console.log('- clienteId:', req.body.clienteId);
      console.log('- valor:', req.body.valor);
      
      const { 
        tipo, 
        orderID, 
        status, 
        destinatario, 
        telefone, 
        data, 
        hora, 
        link_midia,
        clienteId,
        valor 
      } = req.body;
      
      // VALIDAÇÃO
      if (!tipo || !orderID || !status) {
        console.error('❌ Dados mínimos não recebidos');
        return res.status(400).json({ 
          success: false,
          error: 'Envie: tipo, orderID, status' 
        });
      }
      
      console.log(`✅ Pagamento confirmado: ${orderID} - ${tipo}`);
      
      // 🎯 PREPARAR DADOS PARA SALVAR (COM TODOS OS CAMPOS)
      const dadosParaSalvar = {
        // Campos principais
        tipo: tipo || 'audio',
        order_id: orderID,
        status: status || 'pago',
        
        // 🚨 AGORA SALVANDO OS DADOS DO FORMULÁRIO
        destinatario: destinatario || 'Não informado',
        telefone: telefone ? telefone.replace(/\D/g, '') : '00000000000',
        data_agendamento: data || new Date().toISOString().split('T')[0],
        hora_agendamento: hora || '12:00',
        
        // Outros campos
        link_midia: link_midia || null,
        clienteId: clienteId || 'sem-cadastro',
        valor: valor || 5.00,
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      console.log('💾 DADOS PARA SALVAR NO BANCO:');
      console.log(JSON.stringify(dadosParaSalvar, null, 2));
      
      // Verificar se já existe
      const { data: existe } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('order_id', orderID)
        .maybeSingle();
      
      let resultado;
      
      if (existe) {
        // Atualizar registro existente
        console.log(`🔄 Atualizando registro existente ID: ${existe.id}`);
        const { data, error } = await supabase
          .from('agendamentos')
          .update(dadosParaSalvar)
          .eq('id', existe.id)
          .select();
        
        if (error) {
          console.error('❌ Erro ao atualizar:', error);
          throw error;
        }
        resultado = data;
      } else {
        // Inserir novo registro
        console.log('➕ Inserindo novo registro');
        const { data, error } = await supabase
          .from('agendamentos')
          .insert([dadosParaSalvar])
          .select();
        
        if (error) {
          console.error('❌ Erro ao inserir:', error);
          throw error;
        }
        resultado = data;
      }
      
      console.log('✅ REGISTRO SALVO COM SUCESSO!');
      console.log('📊 ID:', resultado[0]?.id);
      console.log('🎯 Order ID:', resultado[0]?.order_id);
      console.log('👤 Destinatário:', resultado[0]?.destinatario);
      console.log('📅 Data:', resultado[0]?.data_agendamento);
      console.log('🕒 Hora:', resultado[0]?.hora_agendamento);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Pagamento e dados salvos com sucesso!',
        orderID: orderID,
        registro: resultado[0]
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
