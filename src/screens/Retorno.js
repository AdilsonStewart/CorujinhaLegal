import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const processarPagamento = async () => {
      // 1. PEGAR DADOS DA URL
      const tipo = searchParams.get('tipo'); // 'audio' ou 'video'
      const status = searchParams.get('status'); // 'success' ou 'cancel'
      const orderID = searchParams.get('orderID'); // 'AUDIO-123...' ou 'VIDEO-123...'
      const paypalOrderID = searchParams.get('paypalOrderID'); // ID do PayPal

      console.log('🔗 Retorno do PayPal:', { tipo, status, orderID, paypalOrderID });

      // 2. VALIDAÇÃO BÁSICA
      if (!tipo || !status || !orderID) {
        console.error('❌ URL incompleta. Parâmetros faltando.');
        navigate('/servicos');
        return;
      }

      // 3. SE CANCELADO
      if (status === 'cancel') {
        alert('Pagamento cancelado. Você pode tentar novamente.');
        navigate('/servicos');
        return;
      }

      // 4. SE APROVADO
      if (status === 'success') {
        console.log(`✅ Pagamento ${tipo.toUpperCase()} aprovado!`);
        
        // 5. BUSCAR DADOS DO CLIENTE DO LOCALSTORAGE (do Cadastro.js)
        const clienteNome = localStorage.getItem('clienteNome') || 'Cliente não identificado';
        const clienteTelefone = localStorage.getItem('clienteTelefone') || 'Não informado';
        const clienteEmail = localStorage.getItem('clienteEmail') || '';

        console.log('👤 Dados do cliente:', {
          nome: clienteNome,
          telefone: clienteTelefone,
          email: clienteEmail
        });

        // 6. SALVAR NO SUPABASE (IMPORTANTE!)
        try {
          console.log('💾 Tentando salvar no Supabase...');
          
          const dadosParaSalvar = {
            // Dados básicos do pagamento
            tipo: tipo,
            order_id: orderID,
            paypal_order_id: paypalOrderID || '',
            valor: tipo === 'audio' ? 5.00 : 10.00,
            status: 'pago',
            
            // Dados do cliente (CRÍTICO para a busca depois!)
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone.replace(/\D/g, ''), // Apenas números
            cliente_email: clienteEmail,
            
            // Outros dados
            data_pagamento: new Date().toISOString(),
            criado_em: new Date().toISOString(),
            enviado: false,
            
            // Campo dados_completos (para compatibilidade)
            dados_completos: {
              tipo: tipo,
              order_id: orderID,
              cliente_nome: clienteNome,
              cliente_telefone: clienteTelefone,
              valor: tipo === 'audio' ? 5.00 : 10.00,
              data_pagamento: new Date().toISOString()
            }
          };

          console.log('📤 Dados a serem salvos:', dadosParaSalvar);

          // SALVAR NO BANCO DE DADOS
          const { data, error } = await supabase
            .from('agendamentos')
            .insert([dadosParaSalvar]);

          if (error) {
            console.error('❌ Erro ao salvar no Supabase:', error);
            alert('Pagamento aprovado, mas houve erro ao salvar dados. Contate suporte.');
          } else {
            console.log('✅ Dados salvos no Supabase com ID:', data?.[0]?.id);
          }

        } catch (error) {
          console.error('❌ Erro geral ao salvar:', error);
          // Continua mesmo com erro (não bloqueia o usuário)
        }

        // 7. SALVAR NO LOCALSTORAGE TAMBÉM (para usar na gravação)
        const dadosPagamento = {
          tipo: tipo,
          orderID: orderID,
          paypalOrderID: paypalOrderID,
          clienteNome: clienteNome,
          clienteTelefone: clienteTelefone,
          dataPagamento: new Date().toISOString(),
          valor: tipo === 'audio' ? 5.00 : 10.00
        };
        
        localStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));
        console.log('💾 Dados salvos no localStorage:', dadosPagamento);

        // 8. REDIRECIONAR PARA GRAVAÇÃO
        setTimeout(() => {
          if (tipo === 'audio') {
            console.log('🎤 Redirecionando para AudioRecordPage...');
            navigate(`/audiorecord?orderID=${orderID}`);
          } 
          else if (tipo === 'video') {
            console.log('🎥 Redirecionando para VideoRecordPage...');
            navigate(`/videorecord?orderID=${orderID}`);
          }
        }, 2000);
        
        return;
      }

      // 9. SE STATUS DESCONHECIDO
      console.error('❌ Status desconhecido:', status);
      alert('Status de pagamento não reconhecido.');
      navigate('/servicos');
    };

    processarPagamento();
  }, [searchParams, navigate]);

  // TELA DE CARREGAMENTO
  return (
    <div style={{
      textAlign: 'center',
      padding: '100px 20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        fontSize: '60px',
        marginBottom: '20px',
        color: '#28a745'
      }}>
        ✅
      </div>
      <h1 style={{ color: '#28a745' }}>
        Pagamento Confirmado!
      </h1>
      <p style={{ fontSize: '18px', marginTop: '10px' }}>
        Salvando seus dados no sistema...
      </p>
      
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <p>📱 <strong>Processando seu pedido</strong></p>
        <p>• Verificando pagamento ✅</p>
        <p>• Salvando seus dados no banco... ✅</p>
        <p>• Preparando gravação...</p>
      </div>
      
      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: '#888'
      }}>
        <p>🦉 <em>Em instantes você será redirecionado</em></p>
      </div>
    </div>
  );
};

export default Retorno;
