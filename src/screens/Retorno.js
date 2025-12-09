import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processando');
  const [mensagem, setMensagem] = useState('Processando seu pagamento...');

  useEffect(() => {
    const processarPagamento = async () => {
      // 1. Pegar parâmetros da URL
      const tipo = searchParams.get('tipo');
      const statusPagamento = searchParams.get('status');
      const orderID = searchParams.get('orderID');

      // 2. Se o pagamento foi cancelado
      if (statusPagamento === 'cancel') {
        setStatus('cancelado');
        setMensagem('Pagamento cancelado. Você pode tentar novamente quando quiser.');
        setTimeout(() => navigate('/servicos'), 3000);
        return;
      }

      // 3. Se o pagamento foi aprovado
      if (statusPagamento === 'success') {
        try {
          // 4. Pegar dados do localStorage (salvos pela página Agendamento.js)
          const agendamentoSalvo = localStorage.getItem('agendamento_corujinha');
          const agendamento = agendamentoSalvo ? JSON.parse(agendamentoSalvo) : {};

          // 5. Preparar dados para enviar ao webhook
          const dadosWebhook = {
            tipo: tipo,
            orderID: orderID,
            status: statusPagamento,
            destinatario: agendamento.nomeDestinatario || 'Cliente',
            telefone: agendamento.telefone || 'Não informado',
            data: agendamento.data || new Date().toISOString().split('T')[0],
            hora: agendamento.hora || '12:00'
          };

          // 6. Enviar para a API
          const response = await fetch('/api/paypal-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosWebhook)
          });

          const resultado = await response.json();

          // 7. Verificar resposta
          if (response.ok && resultado.success) {
            setStatus('sucesso');
            setMensagem('✅ Pagamento confirmado! Seu agendamento foi registrado com sucesso.');
            
            // 8. Limpar localStorage
            localStorage.removeItem('agendamento_corujinha');
            
            // 9. Redirecionar para página de saída
            setTimeout(() => navigate('/saida'), 3000);
          } else {
            setStatus('erro');
            setMensagem(`❌ Erro: ${resultado.error || 'Não foi possível registrar o agendamento.'}`);
          }
        } catch (error) {
          console.error('Erro:', error);
          setStatus('erro');
          setMensagem('❌ Erro inesperado. Por favor, entre em contato com o suporte.');
        }
      }
    };

    processarPagamento();
  }, [searchParams, navigate]);

  // Estilos
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
      <h1>Processando Retorno do Pagamento</h1>
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
      </div>
    </div>
  );
};

export default Retorno;
