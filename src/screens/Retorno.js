import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const processarPagamento = async () => {
      // 1. PEGAR DADOS DA URL
      const tipo = searchParams.get('tipo');
      const status = searchParams.get('status');
      const orderID = searchParams.get('orderID');
      const paypalOrderID = searchParams.get('paypalOrderID');

      console.log('🔗 Retorno PayPal:', { tipo, status, orderID });

      // 2. VALIDAÇÃO
      if (!tipo || !status || !orderID) {
        navigate('/servicos');
        return;
      }

      // 3. SE CANCELADO
      if (status === 'cancel') {
        alert('Pagamento cancelado');
        navigate('/servicos');
        return;
      }

      // 4. SE APROVADO
      if (status === 'success') {
        console.log(`✅ Pagamento ${tipo.toUpperCase()} aprovado!`);
        
        // 5. ⭐⭐ ENVIAR DADOS PARA O WEBHOOK DO SEU BACKEND ⭐⭐
        try {
          // Dados do cliente (do localStorage)
          const clienteNome = localStorage.getItem('clienteNome') || 'Cliente';
          const clienteTelefone = localStorage.getItem('clienteTelefone') || '';
          
          // Dados para enviar ao webhook
          const dadosParaWebhook = {
            tipo: tipo,
            orderID: orderID,
            status: 'pago',
            paypalOrderID: paypalOrderID,
            
            // ⭐⭐ DADOS DO CLIENTE (CRÍTICO) ⭐⭐
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            remetente: clienteNome,
            telefone_remetente: clienteTelefone,
            
            // Para compatibilidade
            destinatario: clienteNome,
            telefone: clienteTelefone,
            
            data_pagamento: new Date().toISOString()
          };
          
          console.log('📤 Enviando para webhook:', dadosParaWebhook);
          
          // ⭐⭐ CHAMAR SEU WEBHOOK ⭐⭐
          const response = await fetch('/api/paypal-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosParaWebhook)
          });
          
          const result = await response.json();
          console.log('📥 Resposta do webhook:', result);
          
          if (!result.success) {
            console.error('❌ Webhook falhou:', result.error);
          }
          
        } catch (error) {
          console.error('❌ Erro ao chamar webhook:', error);
          // Continua mesmo com erro
        }

        // 6. REDIRECIONAR PARA GRAVAÇÃO
        setTimeout(() => {
          if (tipo === 'audio') {
            navigate(`/audiorecord?orderID=${orderID}`);
          } else {
            navigate(`/videorecord?orderID=${orderID}`);
          }
        }, 1500);
        
        return;
      }

      // 7. SE STATUS DESCONHECIDO
      alert('Status não reconhecido');
      navigate('/servicos');
    };

    processarPagamento();
  }, [searchParams, navigate]);

  return (
    <div style={{
      textAlign: 'center',
      padding: '100px 20px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ fontSize: '60px', color: '#28a745' }}>✅</div>
      <h1 style={{ color: '#28a745' }}>Pagamento Confirmado!</h1>
      <p>Processando seus dados...</p>
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <p>🦉 <strong>Salvando no sistema...</strong></p>
        <p>• Enviando dados para o banco</p>
        <p>• Preparando gravação</p>
      </div>
    </div>
  );
};

export default Retorno;
