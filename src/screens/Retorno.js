import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Retorno = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processando');
  const [mensagem, setMensagem] = useState('Processando seu pagamento...');

  useEffect(() => {
    // Pegar os parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo');
    const statusPagamento = params.get('status');
    const orderID = params.get('orderID');

    // Se o pagamento foi cancelado
    if (statusPagamento === 'cancel') {
      setStatus('cancelado');
      setMensagem('Pagamento cancelado. Você pode tentar novamente.');
      return;
    }

    // Se o pagamento foi aprovado
    if (statusPagamento === 'success' && orderID) {
      // Pegar os dados do agendamento do localStorage
      const agendamento = JSON.parse(localStorage.getItem('agendamento') || '{}');

      // Chamar o webhook para salvar no banco de dados
      fetch('/api/paypal-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo,
          orderID,
          status: 'approved',
          destinatario: agendamento.nomeDestinatario || 'Não informado',
          data: agendamento.data || 'Não informada',
          hora: agendamento.hora || 'Não informada',
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setStatus('sucesso');
            setMensagem('Pagamento confirmado! Seu agendamento foi registrado com sucesso.');
            // Limpar o localStorage
            localStorage.removeItem('agendamento');
            // Redirecionar para a página de saída após 3 segundos
            setTimeout(() => {
              navigate('/saida');
            }, 3000);
          } else {
            setStatus('erro');
            setMensagem('Erro ao registrar o pagamento. Entre em contato com o suporte.');
          }
        })
        .catch((error) => {
          console.error('Erro ao chamar webhook:', error);
          setStatus('erro');
          setMensagem('Erro ao processar pagamento. Tente novamente mais tarde.');
        });
    } else {
      setStatus('erro');
      setMensagem('Parâmetros inválidos na URL.');
    }
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.titulo}>Status do Pagamento</h1>
        <div style={styles.conteudo}>
          {status === 'processando' && (
            <div>
              <div style={styles.spinner}></div>
              <p style={styles.mensagem}>{mensagem}</p>
            </div>
          )}
          {status === 'sucesso' && (
            <div>
              <div style={styles.iconeSucesso}>✓</div>
              <p style={styles.mensagemSucesso}>{mensagem}</p>
              <p style={styles.detalhe}>Redirecionando para a página de confirmação...</p>
            </div>
          )}
          {status === 'cancelado' && (
            <div>
              <div style={styles.iconeCancelado}>✗</div>
              <p style={styles.mensagemCancelado}>{mensagem}</p>
              <button
                style={styles.botao}
                onClick={() => navigate('/servicos')}
              >
                Voltar para Serviços
              </button>
            </div>
          )}
          {status === 'erro' && (
            <div>
              <div style={styles.iconeCancelado}>⚠</div>
              <p style={styles.mensagemCancelado}>{mensagem}</p>
              <button
                style={styles.botao}
                onClick={() => navigate('/servicos')}
              >
                Voltar para Serviços
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
  },
  titulo: {
    color: '#333',
    marginBottom: '30px',
  },
  conteudo: {
    marginTop: '20px',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #0066CC',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  mensagem: {
    color: '#666',
    fontSize: '16px',
  },
  iconeSucesso: {
    fontSize: '60px',
    color: '#28a745',
    marginBottom: '20px',
  },
  mensagemSucesso: {
    color: '#28a745',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  detalhe: {
    color: '#666',
    fontSize: '14px',
    marginTop: '10px',
  },
  iconeCancelado: {
    fontSize: '60px',
    color: '#dc3545',
    marginBottom: '20px',
  },
  mensagemCancelado: {
    color: '#dc3545',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  botao: {
    backgroundColor: '#0066CC',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px',
  },
};

// Adicionar animação do spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default Retorno;
