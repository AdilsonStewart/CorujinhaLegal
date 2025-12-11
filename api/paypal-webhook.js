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
      // 🚨 PARTE CORRIGIDA: FRONTEND APÓS PAGAMENTO (dados COMPLETOS)
      console.log('🔄 FRONTEND DETECTADO (após pagamento)');
      console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      // AGORA PEGAMOS TODOS OS DADOS DO FORMULÁRIO
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
      
      // VALIDAÇÃO COMPLETA
      if (!tipo || !orderID || !status) {
        console.error('❌ Dados mínimos não recebidos');
        return res.status(400).json({ 
          success: false,
          error: 'Envie: tipo, orderID, status' 
        });
      }
      
      console.log(`✅ Pagamento confirmado: ${orderID} - ${tipo}`);
      console.log(`📞 Destinatário: ${destinatario || 'Não informado'}`);
      console.log(`📅 Data: ${data || 'Não informada'}`);
      console.log(`🕒 Hora: ${hora || 'Não informada'}`);
      
      // 🚨 SALVAR TODOS OS DADOS NO BANCO (AGORA COM FORMULÁRIO)
      const dadosParaSalvar = {
        tipo: tipo || 'audio',
        order_id: orderID,
        status: status || 'pago',
        
        // DADOS DO DESTINATÁRIO (AGORA VÃO SER SALVOS)
        destinatario: destinatario || 'Não informado',
        telefone: telefone ? telefone.replace(/\D/g, '') : '00000000000',
        
        // DATA E HORA DO AGENDAMENTO
        data_agendamento: data || new Date().toISOString().split('T')[0],
        hora_agendamento: hora || '12:00',
        
        // Outros campos
        link_midia: link_midia || null,
        clienteId: clienteId || 'sem-cadastro',
        valor: valor || 5.00,
        criado_em: new Date().toISOString(),
        enviado: false
      };
      
      console.log('💾 Dados a serem salvos:', dadosParaSalvar);
      
      // Verificar se já existe (para evitar duplicatas)
      const { data: existe } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('order_id', orderID)
        .maybeSingle();
      
      let resultado;
      
      if (existe) {
        // Atualizar registro existente
        console.log('🔄 Atualizando registro existente:', existe.id);
        const { data, error } = await supabase
          .from('agendamentos')
          .update(dadosParaSalvar)
          .eq('id', existe.id)
          .select();
        
        if (error) throw error;
        resultado = data;
      } else {
        // Inserir novo registro
        console.log('➕ Inserindo novo registro');
        const { data, error } = await supabase
          .from('agendamentos')
          .insert([dadosParaSalvar])
          .select();
        
        if (error) throw error;
        resultado = data;
      }
      
      console.log('✅ Dados SALVOS no Supabase:', resultado);
      
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
