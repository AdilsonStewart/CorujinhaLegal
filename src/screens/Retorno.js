import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processando');
  const [mensagem, setMensagem] = useState('Processando seu pagamento...');

  useEffect(() => {
    const processarPagamento = async () => {
      // 1. Pegar TUDO da URL
      const tipo = searchParams.get('tipo');
      const statusPagamento = searchParams.get('status');
      const orderID = searchParams.get('orderID');
      const paypalOrderID = searchParams.get('paypalOrderID');

      console.log('🔍 URL completa:', {
        tipo: tipo,
        status: statusPagamento,
        orderID: orderID,
        paypalOrderID: paypalOrderID
      });

      // 2. Se cancelado
      if (statusPagamento === 'cancel') {
        setStatus('cancelado');
        setMensagem('Pagamento cancelado.');
        setTimeout(() => navigate('/servicos'), 3000);
        return;
      }

      // 3. Se aprovado
      if (statusPagamento === 'success' && orderID && tipo) {
        try {
          // 4. Dados MÍNIMOS e CORRETOS para webhook
          const dadosWebhook = {
            tipo: tipo,  // "audio" ou "video"
            orderID: orderID,  // "AUDIO-123..." ou "VIDEO-123..."
            status: 'pago'  // SEMPRE "pago"
          };

          console.log('📤 Enviando PARA WEBHOOK (OBRIGATÓRIO):', dadosWebhook);

          // 5. Enviar para API
          const response = await fetch('/api/paypal-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosWebhook)
          });

          const resultado = await response.json();
          console.log('📥 RESPOSTA DO WEBHOOK:', resultado);

          // 6. Se deu certo
          if (response.ok && resultado.success) {
            setStatus('sucesso');
            setMensagem('✅ Pagamento confirmado! Agora você pode gravar.');
            
            // Salvar no localStorage para usar depois
            localStorage.setItem('ultimoPagamento', JSON.stringify({
              orderID: orderID,
              tipo: tipo,
              paypalOrderID: paypalOrderID,
              data: new Date().toISOString()
            }));
            
            // Redirecionar para GRAVAÇÃO
            setTimeout(() => {
              navigate(`/gravar?orderID=${orderID}&tipo=${tipo}`);
            }, 1500);
            
          } else {
            setStatus('erro');
            setMensagem(`❌ Erro: ${resultado.error || 'Webhook rejeitou'}`);
          }
          
        } catch (error) {
          console.error('💥 Erro inesperado:', error);
          setStatus('erro');
          setMensagem('❌ Erro de conexão. Contate o suporte.');
        }
      } else {
        // Se faltam dados na URL
        setStatus('erro');
        setMensagem('❌ Dados incompletos na URL. Faltam: tipo e/ou orderID');
        console.error('❌ FALTAM DADOS NA URL:', { tipo, statusPagamento, orderID });
      }
    };

    processarPagamento();
  }, [searchParams, navigate]);

  // Estilos (mantenha os SEUS estilos)
  const containerStyle = {
    textAlign: 'center',
    padding: '50px 20px',
    maxWidth: '600px',
    margin: '0 auto'
  };

  const cardStyle = {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginTop: '20px'
  };

  const statusColors = {
    processando: '#FFA500',
    sucesso: '#28a745',
    erro: '#dc3545',
    cancelado: '#6c757d'
  };

  return (
    <div style={containerStyle}>
      <h1>Retorno do Pagamento</h1>
      <div style={cardStyle}>
        <div style={{
          fontSize: '60px',
          color: statusColors[status],
          marginBottom: '20px'
        }}>
          {status === 'processando' && '⏳'}
          {status === 'sucesso' && '✅'}
          {status === 'erro' && '❌'}
          {status === 'cancelado' && '⚠️'}
        </div>
        <h2 style={{ color: statusColors[status] }}>
          {status === 'processando' && 'Processando...'}
          {status === 'sucesso' && 'Sucesso!'}
          {status === 'erro' && 'Erro'}
          {status === 'cancelado' && 'Cancelado'}
        </h2>
        <p style={{ fontSize: '18px', marginTop: '20px' }}>{mensagem}</p>
        
        {status === 'erro' && (
          <button 
            onClick={() => navigate('/servicos')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Voltar para Serviços
          </button>
        )}
      </div>
    </div>
  );
};

export default Retorno;
