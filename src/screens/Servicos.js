import React, { useEffect, useRef } from "react";

const Servicos = () => {
  // 🔒 CONTROLES DE SEGURANÇA
  const paypalInitialized = useRef(false);
  const loadingAttempts = useRef(0);
  const maxAttempts = 3;

  // 🧹 FUNÇÃO PARA LIMPAR TOTALMENTE
  const cleanupPayPal = () => {
    // Remove todos os scripts do PayPal
    document.querySelectorAll('script[src*="paypal.com"]').forEach(script => {
      script.remove();
    });
    
    // Remove todos os botões PayPal renderizados
    document.querySelectorAll('[data-paypal-button], iframe[src*="paypal.com"]').forEach(el => {
      el.remove();
    });
    
    // Limpa containers
    const audioContainer = document.getElementById('paypal-audio');
    const videoContainer = document.getElementById('paypal-video');
    
    if (audioContainer) audioContainer.innerHTML = '';
    if (videoContainer) videoContainer.innerHTML = '';
    
    console.log('🧹 PayPal limpo completamente');
  };

  // 🚀 INICIALIZAR PAYPAPEL UMA ÚNICA VEZ
  const initializePayPal = () => {
    if (paypalInitialized.current) {
      console.log('⏭️ PayPal já inicializado, pulando...');
      return;
    }
    
    if (loadingAttempts.current >= maxAttempts) {
      console.warn('⚠️ Máximo de tentativas alcançado');
      return;
    }
    
    loadingAttempts.current += 1;
    console.log(`🔄 Tentativa ${loadingAttempts.current} de ${maxAttempts}`);
    
    // 1. LIMPEZA TOTAL ANTES DE COMEÇAR
    cleanupPayPal();
    
    // 2. CARREGAR SDK APENAS SE NÃO EXISTIR
    if (!document.querySelector('script[src*="paypal.com/sdk/js"]')) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=AWcGR2Fa2OoZ8lTaDiGTIvQh0q7t-OPAZun6x3ixjad1CYn-CMc0Sp8Xm3NtGF6JvSJpZK9_Sd4b4Pqb&currency=BRL&intent=capture&disable-funding=credit,card,paylater`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ PayPal SDK carregado com sucesso');
        // Pequeno delay para garantir estabilidade
        setTimeout(renderPayPalButtons, 500);
      };
      
      script.onerror = () => {
        console.error('❌ Falha ao carregar PayPal SDK');
        paypalInitialized.current = false;
      };
      
      document.head.appendChild(script);
    } else {
      // SDK já está carregado, só renderizar
      setTimeout(renderPayPalButtons, 100);
    }
  };

  // 🎨 RENDERIZAR BOTÕES COM SEGURANÇA
  const renderPayPalButtons = () => {
    if (!window.paypal || paypalInitialized.current) {
      console.log('⏭️ PayPal não disponível ou já inicializado');
      return;
    }
    
    try {
      console.log('🎨 Renderizando botões PayPal...');
      
      // BOTÃO ÁUDIO
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'pay'
        },
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              description: "Áudio 30s - CorujinhaLegal",
              amount: { currency_code: "BRL", value: "5.00" },
              custom_id: `AUDIO-${Date.now()}`,
            }],
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then((details) => {
            const nome = details.payer.name?.given_name || "amigo";
            alert(`🎉 Obrigado, ${nome}! Seu áudio de 30s já está na fila de produção.`);
            window.location.href = `/retorno?tipo=audio&status=success&orderID=${data.orderID}`;
          });
        },
        onCancel: () => {
          console.log('❌ Pagamento de áudio cancelado');
          window.location.href = "/retorno?tipo=audio&status=cancel";
        },
        onError: (err) => {
          console.error('💥 Erro no pagamento áudio:', err);
          alert("Ops, erro no PayPal. Tente de novo!");
        },
      }).render("#paypal-audio").then(() => {
        console.log('✅ Botão ÁUDIO renderizado');
      }).catch(err => {
        console.error('❌ Erro ao renderizar botão áudio:', err);
      });

      // BOTÃO VÍDEO
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay'
        },
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              description: "Vídeo 30s - CorujinhaLegal",
              amount: { currency_code: "BRL", value: "10.00" },
              custom_id: `VIDEO-${Date.now()}`,
            }],
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then((details) => {
            const nome = details.payer.name?.given_name || "amigo";
            alert(`🎬 Valeu, ${nome}! Seu vídeo de 30s já está na fila de produção.`);
            window.location.href = `/retorno?tipo=video&status=success&orderID=${data.orderID}`;
          });
        },
        onCancel: () => {
          console.log('❌ Pagamento de vídeo cancelado');
          window.location.href = "/retorno?tipo=video&status=cancel";
        },
        onError: (err) => {
          console.error('💥 Erro no pagamento vídeo:', err);
          alert("Ops, erro no PayPal. Tente de novo!");
        },
      }).render("#paypal-video").then(() => {
        console.log('✅ Botão VÍDEO renderizado');
      }).catch(err => {
        console.error('❌ Erro ao renderizar botão vídeo:', err);
      });

      // 🏁 MARCA COMO INICIALIZADO
      paypalInitialized.current = true;
      console.log('🚀 PayPal inicializado com sucesso!');
      
    } catch (error) {
      console.error('💥 Erro crítico ao renderizar PayPal:', error);
      paypalInitialized.current = false;
    }
  };

  // ⚡ EFFECT PRINCIPAL
  useEffect(() => {
    console.log('🏁 Componente Servicos montado');
    
    // Pequeno delay antes de iniciar
    const timer = setTimeout(() => {
      initializePayPal();
    }, 300);
    
    // Limpeza ao desmontar
    return () => {
      clearTimeout(timer);
      console.log('♻️ Componente Servicos desmontado');
      paypalInitialized.current = false;
    };
  }, []);

  // 🎨 RENDER DA PÁGINA
  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", textAlign: "center", padding: "20px" }}>
      <h2 style={{ color: "#333", marginBottom: "30px" }}>Escolha seu serviço</h2>

      {/* CARD ÁUDIO */}
      <div style={cardStyle}>
        <div style={imagePlaceholderStyle('#007bff', '#0056b3')}>
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎤</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>ÁUDIO 30s</div>
          <div style={{ fontSize: "16px", opacity: 0.9 }}>R$ 5,00</div>
        </div>
        <h3 style={{ color: "#333", margin: "15px 0" }}>ÁUDIO 30s — R$ 5,00</h3>
        <div id="paypal-audio" style={{ marginTop: "20px", minHeight: "60px" }}></div>
        <div style={helpText}>
          Clique no botão azul acima para pagar com PayPal, cartão ou Pix
        </div>
      </div>

      {/* CARD VÍDEO */}
      <div style={cardStyle}>
        <div style={imagePlaceholderStyle('#28a745', '#1e7e34')}>
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎥</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>VÍDEO 30s</div>
          <div style={{ fontSize: "16px", opacity: 0.9 }}>R$ 10,00</div>
        </div>
        <h3 style={{ color: "#333", margin: "15px 0" }}>VÍDEO 30s — R$ 10,00</h3>
        <div id="paypal-video" style={{ marginTop: "20px", minHeight: "60px" }}></div>
        <div style={helpText}>
          Clique no botão dourado acima para pagar com PayPal, cartão ou Pix
        </div>
      </div>

      {/* INFORMAÇÕES */}
      <div style={infoBoxStyle}>
        <p style={{ fontWeight: "bold", marginBottom: "10px", color: "#495057" }}>
          💡 Como funciona:
        </p>
        <ol style={instructionsStyle}>
          <li>Escolha áudio (R$ 5) ou vídeo (R$ 10)</li>
          <li>Clique no botão do PayPal</li>
          <li>Pague com PayPal, cartão ou Pix</li>
          <li>Grave sua mensagem de 30 segundos</li>
          <li>Agende data e hora do envio</li>
          <li>Pronto! SMS será enviado automaticamente 🎉</li>
        </ol>
      </div>
    </div>
  );
};

// 🎨 ESTILOS
const cardStyle = {
  backgroundColor: "#ffffff",
  padding: "25px",
  borderRadius: "12px",
  margin: "25px 0",
  border: "1px solid #e0e0e0",
  boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const imagePlaceholderStyle = (color1, color2) => ({
  width: "100%",
  height: "200px",
  background: `linear-gradient(135deg, ${color1}, ${color2})`,
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontFamily: "Arial, sans-serif",
  marginBottom: "20px",
});

const helpText = {
  fontSize: "14px",
  color: "#666",
  marginTop: "10px",
  fontStyle: "italic",
};

const infoBoxStyle = {
  marginTop: "30px",
  padding: "20px",
  background: "#f8f9fa",
  borderRadius: "10px",
  border: "1px solid #e9ecef",
  textAlign: "left",
};

const instructionsStyle = {
  margin: "0",
  paddingLeft: "20px",
  color: "#6c757d",
  lineHeight: "1.6",
};

export default Servicos;
