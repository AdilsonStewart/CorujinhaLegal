import React, { useEffect, useRef } from "react";

const Servicos = () => {
  const paypalInitialized = useRef(false);

  useEffect(() => {
    if (paypalInitialized.current) return;

    const existente = document.querySelector('script[src*="paypal.com/sdk/js"]');
    if (existente) existente.remove();

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=AWcGR2Fa2OoZ8lTaDiGTIvQh0q7t-OPAZun6x3ixjad1CYn-CMc0Sp8Xm3NtGF6JvSJpZK9_Sd4b4Pqb&currency=BRL&intent=capture&disable-funding=credit`;
    script.async = true;
    
    script.onload = () => {
      console.log("PayPal SDK carregado!");
      if (!paypalInitialized.current) {
        iniciarBotoesPayPal();
        paypalInitialized.current = true;
      }
    };
    
    script.onerror = (e) => {
      console.error("Erro no SDK:", e);
      alert("Erro ao carregar PayPal. Verifique o Client ID!");
    };
    
    document.head.appendChild(script);

    return () => {
      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }
      paypalInitialized.current = false;
    };
  }, []);

  const iniciarBotoesPayPal = () => {
    if (!window.paypal) {
      console.error("PayPal não carregou ainda.");
      return;
    }

    // Botão ÁUDIO R$ 5,00
    window.paypal.Buttons({
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              description: "Áudio 30s - CorujinhaLegal",
              amount: { currency_code: "BRL", value: "5.00" },
              custom_id: "audio_30s",
            },
          ],
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then((details) => {
          const nome = details.payer.name?.given_name || "amigo";
          alert(`Obrigado, ${nome}! Seu áudio de 30s já está na fila de produção.`);
          window.location.href = `/retorno?tipo=audio&status=success&orderID=${data.orderID}`;
        });
      },
      onCancel: () => {
        window.location.href = "/retorno?tipo=audio&status=cancel";
      },
      onError: (err) => {
        console.error("Erro no pagamento:", err);
        alert("Ops, erro no PayPal. Tente de novo!");
      },
    }).render("#paypal-audio");

    // Botão VÍDEO R$ 10,00
    window.paypal.Buttons({
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              description: "Vídeo 30s - CorujinhaLegal",
              amount: { currency_code: "BRL", value: "10.00" },
              custom_id: "video_30s",
            },
          ],
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then((details) => {
          const nome = details.payer.name?.given_name || "amigo";
          alert(`Valeu, ${nome}! Seu vídeo de 30s já está na fila de produção.`);
          window.location.href = `/retorno?tipo=video&status=success&orderID=${data.orderID}`;
        });
      },
      onCancel: () => {
        window.location.href = "/retorno?tipo=video&status=cancel";
      },
      onError: (err) => {
        console.error("Erro no pagamento:", err);
        alert("Ops, erro no PayPal. Tente de novo!");
      },
    }).render("#paypal-video");
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", textAlign: "center" }}>
      <h2>Escolha seu serviço</h2>

      {/* CARD DO ÁUDIO */}
      <div style={cardStyle}>
        {/* ÁREA DA IMAGEM - VERSÃO CORRIGIDA SEM via.placeholder.com */}
        <div style={{ 
          width: "100%", 
          height: "200px",
          background: "linear-gradient(135deg, #007bff, #0056b3)",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Arial, sans-serif",
          marginBottom: "15px"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎤</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>ÁUDIO 30s</div>
          <div style={{ fontSize: "16px", opacity: 0.9 }}>R$ 5,00</div>
        </div>
        
        <h3>ÁUDIO 30s — R$ 5,00</h3>
        <div id="paypal-audio" style={{ marginTop: "20px", minHeight: "60px" }}></div>
        <button 
          style={btn} 
          onClick={() => alert("Aguarde o botão azul do PayPal aparecer acima!")}
        >
          Pagar com PayPal, Cartão ou Pix
        </button>
      </div>

      {/* CARD DO VÍDEO */}
      <div style={cardStyle}>
        {/* ÁREA DA IMAGEM - VERSÃO CORRIGIDA SEM via.placeholder.com */}
        <div style={{ 
          width: "100%", 
          height: "200px",
          background: "linear-gradient(135deg, #28a745, #1e7e34)",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Arial, sans-serif",
          marginBottom: "15px"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎥</div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>VÍDEO 30s</div>
          <div style={{ fontSize: "16px", opacity: 0.9 }}>R$ 10,00</div>
        </div>
        
        <h3>VÍDEO 30s — R$ 10,00</h3>
        <div id="paypal-video" style={{ marginTop: "20px", minHeight: "60px" }}></div>
        <button 
          style={btn} 
          onClick={() => alert("Aguarde o botão dourado do PayPal aparecer acima!")}
        >
          Pagar com PayPal, Cartão ou Pix
        </button>
      </div>
      
      {/* CAIXA DE INFORMAÇÕES */}
      <div style={{ 
        marginTop: "30px", 
        padding: "15px", 
        background: "#f8f9fa", 
        borderRadius: "10px",
        fontSize: "14px",
        border: "1px solid #e9ecef"
      }}>
        <p style={{ margin: "0 0 10px 0", fontWeight: "bold", color: "#495057" }}>
          💡 Como funciona:
        </p>
        <ol style={{ 
          textAlign: "left", 
          margin: "0", 
          paddingLeft: "20px",
          color: "#6c757d"
        }}>
          <li>Escolha áudio (R$ 5) ou vídeo (R$ 10)</li>
          <li>Clique no botão do PayPal acima</li>
          <li>Pague com PayPal, cartão ou Pix</li>
          <li>Grave sua mensagem de 30 segundos</li>
          <li>Agende data e hora do envio</li>
          <li>Pronto! O SMS será enviado automaticamente 🎉</li>
        </ol>
      </div>
    </div>
  );
};

// ESTILOS
const cardStyle = {
  backgroundColor: "#ffffff",
  padding: "20px",
  borderRadius: "10px",
  margin: "20px 0",
  border: "1px solid #dee2e6",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
};

const btn = {
  backgroundColor: "#0066CC",
  color: "white",
  padding: "14px",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  marginTop: "15px",
};

export default Servicos;
