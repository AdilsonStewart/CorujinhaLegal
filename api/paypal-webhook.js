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
  console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));

  try {
    // VERIFICAR SE É PAYPAL (tem event_type)
    const isPayPal = req.body.event_type && req.body.resource;

    if (isPayPal) {
      console.log('💰 PAYPAL WEBHOOK DETECTADO!');

      const eventType = req.body.event_type;
      const resource = req.body.resource;
      const orderID = resource.id || resource.order_id || 'UNKNOWN';
      const status = resource.status || 'COMPLETED';
      const valor = parseFloat(resource.amount?.value || '0');

      console.log(`🔄 Evento: ${eventType}`);
      console.log(`📋 Order ID: ${orderID}`);
      console.log(`💰 Valor: ${valor}`);

      if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || status === 'COMPLETED') {
        console.log('✅ PAGAMENTO COMPLETO DETECTADO!');

        const customID = resource.custom_id || '';
        const tipo = customID.includes('AUDIO') ? 'audio' : 
                    customID.includes('VIDEO') ? 'video' : 'audio';

        const telefoneRemetente = localStorage?.getItem?.("clienteTelefone") || "00000000000";

        const dadosParaSalvar = {
          data_agendamento: new Date().toISOString().split('T')[0],
          hora_agendamento: '12:00:00',
          criado_em: new Date().toISOString(),
          enviado: false,
          link_midia: '',
          dados_completos: {
            tipo: tipo,
            order_id: customID || orderID,
            paypal_order_id: orderID,
            status: 'pago',
            valor: valor,
            cliente_nome: req.body.cliente_nome || 'Cliente não informado',
            cliente_telefone: req.body.cliente_telefone || '',
            remetente: req.body.remetente || req.body.cliente_nome || 'Cliente',
            telefone_remetente: req.body.telefone_remetente || req.body.cliente_telefone || '',
            destinatario: req.body.destinatario || 'A definir',
            telefone: req.body.telefone || '',
            evento_paypal: eventType,
            data_pagamento: new Date().toISOString()
          },
          evento_paypal: eventType,
          valor: valor
        };

        console.log('📤 Salvando no Supabase:', dadosParaSalvar);

        const { data, error } = await supabase
          .from('agendamentos')
          .insert([dadosParaSalvar])
          .select();

        if (error) {
          console.error('❌ Erro ao salvar no Supabase:', error);
          return res.status(500).json({ success: false, error: 'Erro no banco' });
        }

        console.log('✅ Dados salvos com ID:', data?.[0]?.id);
        return res.status(200).json({ success: true, message: 'Pagamento processado e salvo', orderID: orderID });
      }

      return res.status(200).json({ status: 'RECEIVED' });

    } else {
      console.log('🔄 FRONTEND ENVIOU DADOS APÓS PAGAMENTO');

      const { tipo, orderID, status, cliente_nome, cliente_telefone } = req.body;

      if (!tipo || !orderID || !status) {
        console.error('❌ Dados mínimos faltando');
        return res.status(400).json({ success: false, error: 'Dados incompletos' });
      }

      console.log(`✅ Processando: ${orderID} - ${tipo}`);
      console.log(`👤 Cliente: ${cliente_nome} - ${cliente_telefone}`);

      const dadosParaSalvar = {
        data_agendamento: new Date().toISOString().split('T')[0],
        hora_agendamento: '12:00:00',
        criado_em: new Date().toISOString(),
        enviado: false,
        link_midia: '',
        dados_completos: {
          tipo: tipo,
          order_id: orderID,
          status: status,
          valor: tipo === 'audio' ? 5.00 : 10.00,
          cliente_nome: cliente_nome || 'Cliente',
          cliente_telefone: cliente_telefone || '',
          remetente: cliente_nome || 'Cliente',
          telefone_remetente: cliente_telefone || '',
          destinatario: cliente_nome || 'Cliente',
          telefone: cliente_telefone || '',
          data_pagamento: new Date().toISOString()
        },
        evento_paypal: `FRONTEND_${orderID}`,
        valor: tipo === 'audio' ? 5.00 : 10.00
      };

      const { data, error } = await supabase
        .from('agendamentos')
        .insert([dadosParaSalvar])
        .select();

      if (error) {
        console.error('❌ Erro no banco:', error);
        return res.status(500).json({ success: false, error: 'Erro ao salvar' });
      }

      console.log('✅ Pagamento salvo no banco! ID:', data?.[0]?.id);
      return res.status(200).json({ success: true, message: 'Dados salvos com sucesso!', orderID: orderID });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    return res.status(500).json({ success: false, error: 'Erro interno' });
  }
};

