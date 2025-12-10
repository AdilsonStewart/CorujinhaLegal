import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const processarPagamento = () => {
      // 1. PEGAR DADOS DA URL (OBRIGATÓRIOS)
      const tipo = searchParams.get('tipo'); // 'audio' ou 'video'
      const statusPagamento = searchParams.get('status'); // 'success' ou 'cancel'
      const orderID = searchParams.get('orderID'); // 'AUDIO-123...' ou 'VIDEO-123...'
      const paypalOrderID = searchParams.get('paypalOrderID'); // ID do PayPal

      console.log('🔍 DADOS DA URL:', { tipo, statusPagamento, orderID, paypalOrderID });

      // 2. SE CANCELOU
      if (statusPagamento === 'cancel') {
        alert('❌ Pagamento cancelado. Tente novamente!');
        setTimeout(() => navigate('/servicos'), 1000);
        return;
      }

      // 3. SE APROVOU
      if (statusPagamento === 'success' && tipo && orderID) {
        console.log('💰 PAGAMENTO APROVADO! Redirecionando para gravação...');
        
        // 4. SALVAR NO localStorage (opcional, mas útil)
        localStorage.setItem('pagamentoAtual', JSON.stringify({
          tipo: tipo,
          orderID: orderID,
          paypalOrderID: paypalOrderID,
          pagoEm: new Date().toISOString()
        }));
        
        // 5. REDIRECIONAR DIRETO PARA GRAVAÇÃO (SEM ENVIAR PARA WEBHOOK AGORA)
        // ⚠️ IMPORTANTE: Ajuste '/gravar' para a URL CORRETA da sua tela de gravação
        setTimeout(() => {
          navigate(`/gravar?tipo=${tipo}&orderID=${orderID}`);
        }, 500);
        
      } else {
        // SE FALTAM DADOS
        console.error('❌ DADOS INCOMPLETOS NA URL');
        alert('Erro: Dados incompletos. Contate o suporte.');
        setTimeout(() => navigate('/servicos'), 2000);
      }
    };

    processarPagamento();
  }, [searchParams, navigate]);

  // TELA SIMPLES DE CARREGAMENTO (aparece por menos de 1 segundo)
  return (
    <div style={{
      textAlign: 'center',
      padding: '100px 20px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>⏳</div>
      <h1>Processando pagamento...</h1>
      <p>Aguarde, você será redirecionado em instantes.</p>
    </div>
  );
};

export default Retorno;
