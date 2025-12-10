import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
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
      console.log(`📋 OrderID: ${orderID}`);
      console.log(`💳 PayPal OrderID: ${paypalOrderID || 'não informado'}`);
      
      // 5. SALVAR DADOS PARA USAR NA GRAVAÇÃO
      const dadosPagamento = {
        tipo: tipo,
        orderID: orderID,
        paypalOrderID: paypalOrderID,
        dataPagamento: new Date().toISOString(),
        valor: tipo === 'audio' ? 5.00 : 10.00
      };
      
      localStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));
      console.log('💾 Dados salvos no localStorage:', dadosPagamento);

      // 6. REDIRECIONAR PARA TELA CORRETA
      setTimeout(() => {
        if (tipo === 'audio') {
          console.log('🎤 Redirecionando para AudioRecordPage...');
          navigate(`/audiorecord?orderID=${orderID}`);
        } 
        else if (tipo === 'video') {
          console.log('🎥 Redirecionando para VideoRecordPage...');
          navigate(`/videorecord?orderID=${orderID}`);
        }
        else {
          console.error('❌ Tipo inválido:', tipo);
          navigate('/servicos');
        }
      }, 1500); // Aguardar 1.5 segundos
      
      return;
    }

    // 7. SE STATUS DESCONHECIDO
    console.error('❌ Status desconhecido:', status);
    alert('Status de pagamento não reconhecido.');
    navigate('/servicos');

  }, [searchParams, navigate]);

  // TELA DE CARREGAMENTO (aparece por ~1.5 segundos)
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
        Aguarde um momento...
      </p>
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <p>📱 <strong>Seu pedido está sendo processado</strong></p>
        <p>Você será redirecionado automaticamente para gravar seu conteúdo.</p>
      </div>
    </div>
  );
};

export default Retorno;
