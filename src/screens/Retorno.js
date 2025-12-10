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

      console.log('🔍 Parâmetros da URL:', { tipo, statusPagamento, orderID });

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
          
          if (!agendamentoSalvo) {
            setStatus('erro');
            setMensagem('❌ Dados do agendamento não encontrados. Entre em contato com o suporte.');
            return;
          }
          
          const agendamento = JSON.parse(agendamentoSalvo);
          console.log('📋 Dados do localStorage:', agendamento);

          // 5. Preparar dados para enviar ao webhook - FORMATO CORRETO
          const dadosWebhook = {
            tipo: tipo,
            orderID: orderID,
            status: 'pago',  // ⚠️ IMPORTANTE: Enviar 'pago' e não 'success'
            destinatario: agendamento.nomeDestinatario || agendamento.destinatario || 'Cliente',
            telefone: agendamento.telefone || 'Não informado',
            data: agendamento.data || new Date().toISOString().split('T')[0],
            hora: agendamento.hora || '12:00'
          };

          console.log('📤 Enviando para API:', dadosWebhook);

          // 6. Enviar para a API
          const response = await fetch('/api/paypal-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosWebhook)
          });

          console.log('📥 Resposta da API - Status:', response.status);

          // 7. Verificar resposta - FORMA SIMPLIFICADA
          if (response.ok) {
            const resultado = await response.json();
            console.log('✅ Resposta completa:', resultado);
            
            // Se a resposta tem 'success: true' ou se foi salvo com sucesso
            if (resultado.success || resultado.message) {
              setStatus('sucesso');
              setMensagem('✅ Pagamento confirmado! Seu agendamento foi registrado com sucesso.');
              
              // 8. Limpar localStorage
              localStorage.removeItem('agendamento_corujinha');
              
              // 9. Redirecionar para página de saída
              setTimeout(() => navigate('/saida'), 3000);
            } else {
              setStatus('erro');
              setMensagem('❌ Não foi possível registrar o agendamento.');
            }
          } else {
            // Se a API retornou erro (400, 500, etc.)
            const erro = await response.json();
            console.error('❌ Erro da API:', erro);
            setStatus('erro');
            setMensagem(`❌ Erro: ${erro.error || 'Não foi possível registrar o agendamento.'}`);
          }
        } catch (error) {
          console.error('💥 Erro inesperado:', error);
          setStatus('erro');
          setMensagem('❌ Erro inesperado. Por favor, entre em contato com o suporte.');
        }
      } else {
        // Se não tem status ou é diferente de 'success' ou 'cancel'
        setStatus('erro');
        setMensagem('Status de pagamento não reconhecido.');
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
        
        {/* Mostrar botão para voltar em caso de erro */}
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
