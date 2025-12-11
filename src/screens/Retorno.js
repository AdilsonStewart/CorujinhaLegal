import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. PEGA OS DADOS DO PAYPAL
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status');
    const orderID = searchParams.get('orderID');
    const paypalOrderID = searchParams.get('paypalOrderID');

    console.log('📱 DADOS DO PAYPAL:', { tipo, status, orderID });

    // 2. SE CANCELOU
    if (status === 'cancel') {
      alert('❌ Pagamento cancelado');
      navigate('/servicos');
      return;
    }

    // 3. SE PAGOU
    if (status === 'success') {
      console.log('✅ PAGAMENTO APROVADO');
      
      // 4. PEGA DADOS DO LOCALSTORAGE (do Cadastro)
      const clienteNome = localStorage.getItem('clienteNome');
      const clienteTelefone = localStorage.getItem('clienteTelefone');
      
      console.log('👤 DADOS DO CLIENTE:', {
        nome: clienteNome,
        telefone: clienteTelefone
      });

      // 5. ⭐⭐ SALVA TUDO NO LOCALSTORAGE PARA O WEBHOOK PEGAR ⭐⭐
      const dadosCompletos = {
        // Dados do cliente (CRÍTICO)
        remetente: clienteNome || 'Cliente',
        telefone_remetente: clienteTelefone || '',
        cliente_nome: clienteNome || 'Cliente',
        cliente_telefone: clienteTelefone || '',
        
        // Dados do pedido
        tipo: tipo,
        order_id: orderID,
        paypal_order_id: paypalOrderID || '',
        status: 'pago',
        valor: tipo === 'audio' ? 5.00 : 10.00,
        
        // Data/hora
        data_pagamento: new Date().toISOString(),
        criado_em: new Date().toISOString()
      };

      // ⭐⭐ SALVA EM 3 LUGARES DIFERENTES PARA GARANTIR ⭐⭐
      localStorage.setItem('dadosPagamento', JSON.stringify(dadosCompletos));
      localStorage.setItem('ultimoPagamento', JSON.stringify(dadosCompletos));
      localStorage.setItem('paypal_data', JSON.stringify(dadosCompletos));
      
      console.log('💾 DADOS SALVOS NO LOCALSTORAGE:', dadosCompletos);

      // 6. REDIRECIONA PARA GRAVAR
      setTimeout(() => {
        if (tipo === 'audio') {
          navigate(`/audiorecord?orderID=${orderID}`);
        } else {
          navigate(`/videorecord?orderID=${orderID}`);
        }
      }, 2000);

      return;
    }

    // 7. SE DEU ERRADO
    alert('Erro no processamento');
    navigate('/servicos');

  }, [searchParams, navigate]);

  // TELA SIMPLES
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1 style={{ color: 'green' }}>✅ Pagamento Aprovado!</h1>
      <p>Salvando seus dados...</p>
      <p>🦉 Aguarde, você será redirecionado</p>
    </div>
  );
};

export default Retorno;
