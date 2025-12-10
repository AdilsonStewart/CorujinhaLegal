// TestePayPal.js - PÁGINA DE TESTE SIMPLES
import React, { useEffect, useRef } from 'react';

const TestePayPal = () => {
  const paypalCarregado = useRef(false);

  useEffect(() => {
    // Evita carregar múltiplas vezes
    if (paypalCarregado.current) return;
    
    console.log('🔧 Iniciando teste do PayPal...');
    
    // Remove scripts antigos do PayPal
    const scriptsAntigos = document.querySelectorAll('script[src*="paypal.com"]');
    scriptsAntigos.forEach(script => script.remove());
    
    // Cria novo script
    const script = document.createElement('script');
    script.src = 'https://www.paypal.com/sdk/js?client-id=AWcGR2Fa2OoZ8lTaDiGTIvQh0q7t-OPAZun6x3ixjad1CYn-CMc0Sp8Xm3NtGF6JvSJpZK9_Sd4b4Pqb&currency=BRL&intent=capture';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ SDK PayPal carregado no teste');
      
      if (window.paypal && !paypalCarregado.current) {
        // Botão SIMPLES de teste
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay'
          },
          createOrder: function(data, actions) {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: '1.00', // Valor baixo para teste
                  currency_code: 'BRL'
                },
                description: 'Teste CorujinhaLegal'
              }]
            });
          },
          onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
              alert('🎉 Teste APROVADO! Pagamento de R$ 1,00 realizado.');
              console.log('Detalhes do pagamento:', details);
            });
          },
          onError: function(err) {
            console.error('Erro no PayPal (teste):', err);
            alert('❌ Erro no teste do PayPal');
          }
        }).render('#paypal-test-button');
        
        paypalCarregado.current = true;
        console.log('🎯 Botão de teste renderizado com sucesso');
      }
    };
    
    script.onerror = (err) => {
      console.error('❌ Falha ao carregar SDK PayPal:', err);
      document.getElementById('paypal-test-button').innerHTML = 
        '<p style="color: red; padding: 20px; background: #ffeeee; border-radius: 8px;">' +
        '❌ FALHA: Não foi possível carregar o PayPal. Verifique o Client ID.' +
        '</p>';
    };
    
    document.head.appendChild(script);
    
    // Limpeza quando o componente for desmontado
    return () => {
      paypalCarregado.current = false;
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'Arial, sans-serif',
      color: 'white'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        color: '#333'
      }}>
        
        <h1 style={{ 
          textAlign: 'center', 
          color: '#764ba2', 
          marginBottom: '30px',
          fontSize: '2.5rem'
        }}>
          🧪 TESTE DO PAYPAL
        </h1>
        
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px',
          border: '2px dashed #dee2e6'
        }}>
          <h3 style={{ color: '#495057', marginTop: '0' }}>
            Status do Teste:
          </h3>
          <div id="test-status" style={{
            padding: '15px',
            background: '#e7f3ff',
            borderRadius: '8px',
            marginBottom: '15px',
            fontWeight: 'bold'
          }}>
            🔄 Aguardando carregamento do PayPal...
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#6c757d', marginBottom: '10px' }}>
              Informações do Client ID:
            </h4>
            <div style={{
              fontFamily: 'monospace',
              background: '#2d3748',
              color: '#68d391',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '14px',
              overflowX: 'auto'
            }}>
              AWcGR2Fa2OoZ8lTaDiGTIvQh0q7t-OPAZun6x3ixjad1CYn-CMc0Sp8Xm3NtGF6JvSJpZK9_Sd4b4Pqb
            </div>
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '25px',
          background: 'linear-gradient(135deg, #48bb78, #38a169)',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: 'white', marginTop: '0', fontSize: '1.5rem' }}>
            Botão de Teste PayPal
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '25px' }}>
            Valor de teste: <strong>R$ 1,00</strong><br/>
            (Você pode cancelar no final)
          </p>
          
          {/* CONTAINER DO BOTÃO PAYPAL */}
          <div id="paypal-test-button" style={{
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '8px',
            padding: '15px'
          }}>
            <div style={{ color: '#718096', fontStyle: 'italic' }}>
              Carregando botão PayPal...
            </div>
          </div>
        </div>
        
        <div style={{
          background: '#fff5f5',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: '4px solid #fc8181'
        }}>
          <h4 style={{ color: '#c53030', marginTop: '0' }}>
            🔍 Instruções para Testar:
          </h4>
          <ol style={{ paddingLeft: '20px', color: '#744210' }}>
            <li>Aguarde o botão azul do PayPal aparecer acima</li>
            <li>Clique em "Pagar com PayPal"</li>
            <li>Na tela do PayPal, use:
              <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                <li><strong>Modo Sandbox:</strong> Email: sb-...@business.example.com</li>
                <li><strong>Senha:</strong> A mesma da sua conta sandbox</li>
              </ul>
            </li>
            <li>Complete ou cancele o pagamento</li>
            <li>Volte para esta página e veja o resultado</li>
          </ol>
        </div>
        
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          color: '#718096',
          fontSize: '14px'
        }}>
          <p>
            <strong>App:</strong> CorujinhaLegal<br/>
            <strong>URL de Teste:</strong> /teste-paypal<br/>
            <strong>Status:</strong> {paypalCarregado.current ? '✅ Carregado' : '🔄 Carregando...'}
          </p>
          <button 
            onClick={() => {
              window.location.href = '/servicos';
            }}
            style={{
              marginTop: '15px',
              padding: '10px 25px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ← Voltar para Serviços
          </button>
        </div>
        
      </div>
      
      {/* Script para atualizar status */}
      <script dangerouslySetInnerHTML={{
        __html: `
          setTimeout(() => {
            const statusEl = document.getElementById('test-status');
            if (statusEl && window.paypal) {
              statusEl.innerHTML = '✅ SDK PayPal carregado com sucesso!';
              statusEl.style.background = '#d4edda';
              statusEl.style.color = '#155724';
            }
          }, 1000);
        `
      }} />
      
    </div>
  );
};

export default TestePayPal;
