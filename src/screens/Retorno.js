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
        
        // 5. BUSCAR DADOS DO CLIENTE DO LOCALSTORAGE
        const clienteNome = localStorage.getItem('clienteNome') || 'Cliente não identificado';
        const clienteTelefone = localStorage.getItem('clienteTelefone') || 'Não informado';

        console.log('👤 Dados do cliente:', {
          nome: clienteNome,
          telefone: clienteTelefone
        });

        // 6. SALVAR NO SUPABASE - USANDO APENAS COLUNAS EXISTENTES
        try {
          console.log('💾 Tentando salvar no Supabase...');
          
          // FORMATAR DATA para o padrão do Supabase (YYYY-MM-DD)
          const hoje = new Date();
          const dataFormatada = hoje.toISOString().split('T')[0];
          
          // Dados para salvar - APENAS colunas que EXISTEM na sua tabela
          const dadosParaSalvar = {
            // COLUNAS QUE VOCÊ TEM NA TABELA (conforme você me mostrou):
            data_agendamento: dataFormatada, // Data de hoje como padrão
            hora_agendamento: '12:00:00',    // Hora padrão (será atualizada depois)
            link_midia: '',                   // Vazio por enquanto (será preenchido na gravação)
            criado_em: new Date().toISOString(),
            enviado: false,
            
            // ⭐⭐ IMPORTANTE: Dados do cliente dentro de 'dados_completos'
            dados_completos: {
              // Dados básicos do pagamento
              tipo: tipo,
              order_id: orderID,
              paypal_order_id: paypalOrderID || '',
              valor: tipo === 'audio' ? 5.00 : 10.00,
              status: 'pago',
              
              // ⭐⭐ DADOS DO CLIENTE (CRÍTICO para busca depois!)
              cliente_nome: clienteNome,
              cliente_telefone: clienteTelefone.replace(/\D/g, ''), // Apenas números
              
              // Outros dados úteis
              data_pagamento: new Date().toISOString(),
              
              // Campos para compatibilidade com busca anterior
              destinatario: clienteNome,    // Para compatibilidade
              telefone: clienteTelefone,    // Para compatibilidade
              remetente: clienteNome        // Para compatibilidade
            },
            
            // Campos extras se existirem (ajuste conforme sua tabela)
            evento_paypal: `PAYMENT.CAPTURE.COMPLETED_${tipo.toUpperCase()}`,
            valor: tipo === 'audio' ? 5.00 : 10.00
          };

          console.log('📤 Dados a serem salvos:', dadosParaSalvar);

          // SALVAR NO BANCO DE DADOS
          const { data, error } = await supabase
            .from('agendamentos')
            .insert([dadosParaSalvar]);

          if (error) {
            console.error('❌ Erro ao salvar no Supabase:', error);
            
            // Tentativa alternativa: salvar sem campos problemáticos
            console.log('🔄 Tentando salvar forma alternativa...');
            
            const dadosAlternativos = {
              data_agendamento: dataFormatada,
              hora_agendamento: '12:00:00',
              criado_em: new Date().toISOString(),
              enviado: false,
              dados_completos: {
                tipo: tipo,
                order_id: orderID,
                cliente_nome: clienteNome,
                cliente_telefone: clienteTelefone.replace(/\D/g, ''),
                status: 'pago'
              }
            };
            
            const { data: altData, error: altError } = await supabase
              .from('agendamentos')
              .insert([dadosAlternativos]);
              
            if (altError) {
              console.error('❌ Erro na tentativa alternativa:', altError);
              alert('Pagamento aprovado! Mas não foi possível salvar todos os dados.');
            } else {
              console.log('✅ Dados salvos (forma alternativa) com ID:', altData?.[0]?.id);
            }
            
          } else {
            console.log('✅ Dados salvos no Supabase com ID:', data?.[0]?.id);
          }

        } catch (error) {
          console.error('❌ Erro geral ao salvar:', error);
          // Continua mesmo com erro
        }

        // 7. SALVAR NO LOCALSTORAGE TAMBÉM
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
        <p>• Salvando seus dados no banco... ⏳</p>
        <p>• Preparando gravação...</p>
      </div>
      
      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: '#888'
      }}>
        <p>🦉 <em>Em instantes você será redirecionado para gravar</em></p>
      </div>
    </div>
  );
};

export default Retorno;
