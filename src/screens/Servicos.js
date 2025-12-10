import React, { useEffect, useRef, useState } from "react";

const Servicos = () => {
  const paypalInitialized = useRef(false);
  const [orderIdAudio, setOrderIdAudio] = useState("");
  const [orderIdVideo, setOrderIdVideo] = useState("");

  // Gerar orderIDs únicos quando carregar
  useEffect(() => {
    // OrderID para áudio: AUDIO-data-random
    const audioId = `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setOrderIdAudio(audioId);
    
    // OrderID para vídeo: VIDEO-data-random
    const videoId = `VIDEO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setOrderIdVideo(videoId);
    
    console.log("🎫 OrderIDs gerados:", { audioId, videoId });
    
    // Salvar no localStorage para usar depois na gravação
    localStorage.setItem("lastOrderIdAudio", audioId);
    localStorage.setItem("lastOrderIdVideo", videoId);
  }, []);

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
  }, [orderIdAudio, orderIdVideo]); // ✅ Agora depende dos orderIDs

  const iniciarBotoesPayPal = () => {
    if (!window.paypal) {
      console.error("PayPal não carregou ainda.");
      return;
    }

    console.log("🔄 Iniciando botões PayPal com orderIDs:", {
      audio: orderIdAudio,
      video: orderIdVideo
    });

    // BOTÃO ÁUDIO R$ 5,00
    window.paypal.Buttons({
      createOrder: (data, actions) => {
        console.log("🎤 Criando pedido ÁUDIO:", orderIdAudio);
        return actions.order.create({
          purchase_units: [
            {
              description: "Áudio 30s - CorujinhaLegal",
              amount: { currency_code: "BRL", value: "5.00" },
              custom_id: orderIdAudio, // ✅ AGORA É ÚNICO!
            },
          ],
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then((details) => {
          const nome = details.payer.name?.given_name || "amigo";
          console.log("✅ Pagamento ÁUDIO aprovado:", {
            orderIdPayPal: data.orderID,
            nossoOrderId: orderIdAudio,
            details
          });
          
          // ✅ SALVAR NO LOCALSTORAGE PARA USAR NA GRAVAÇÃO
          localStorage.setItem("currentOrderId", orderIdAudio);
          localStorage.setItem("paymentStatus", "paid");
          
          alert(`Obrigado, ${nome}! Seu áudio de 30s já está na fila de produção.`);
          // ✅ REDIRECIONA COM orderID ÚNICO
          window.location.href = `/retorno?tipo=audio&status=success&orderID=${orderIdAudio}&paypalOrderID=${data.orderID}`;
        });
      },
      onCancel: () => {
        console.log("❌ Pagamento ÁUDIO cancelado");
        window.location.href = `/retorno?tipo=audio&status=cancel&orderID=${orderIdAudio}`;
      },
      onError: (err) => {
        console.error("Erro no pagamento ÁUDIO:", err);
        alert("Ops, erro no PayPal. Tente de novo!");
      },
    }).render("#paypal-audio");

    // BOTÃO VÍDEO R$ 10,00
    window.paypal.Buttons({
      createOrder: (data, actions) => {
        console.log("🎥 Criando pedido VÍDEO:", orderIdVideo);
        return actions.order.create({
          purchase_units: [
            {
              description: "Vídeo 30s - CorujinhaLegal",
              amount: { currency_code: "BRL", value: "10.00" },
              custom_id: orderIdVideo, // ✅ AGORA É ÚNICO!
            },
          ],
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then((details) => {
          const nome = details.payer.name?.given_name || "amigo";
          console.log("✅ Pagamento VÍDEO aprovado:", {
            orderIdPayPal: data.orderID,
            nossoOrderId: orderIdVideo,
            details
          });
          
          // ✅ SALVAR NO LOCALSTORAGE PARA USAR NA GRAVAÇÃO
          localStorage.setItem("currentOrderId", orderIdVideo);
          localStorage.setItem("paymentStatus", "paid");
          
          alert(`Valeu, ${nome}! Seu vídeo de 30s já está na fila de produção.`);
          // ✅ REDIRECIONA COM orderID ÚNICO
          window.location.href = `/retorno?tipo=video&status=success&orderID=${orderIdVideo}&paypalOrderID=${data.orderID}`;
        });
      },
      onCancel: () => {
        console.log("❌ Pagamento VÍDEO cancelado");
        window.location.href = `/retorno?tipo=video&status=cancel&orderID=${orderIdVideo}`;
      },
      onError: (err) => {
        console.error("Erro no pagamento VÍDEO:", err);
        alert("Ops, erro no PayPal. Tente de novo!");
      },
    }).render("#paypal-video");
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", textAlign: "center" }}>
      <h2>Escolha seu serviço</h2>

      <div style={cardStyle}>
        <img
          src="/audio.gif"
          alt="Áudio 30s"
          style={{ width: "100%", borderRadius: "10px", marginBottom: "15px" }}
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/400x200/007bff/ffffff?text=Áudio+30s";
          }}
        />
        <h3>ÁUDIO 30s — R$ 5,00</h3>
        <p style={{ fontSize: "12px", color: "#666" }}>
          OrderID: {orderIdAudio.substring(0, 15)}...
        </p>
        <div id="paypal-audio" style={{ marginTop: "20px", minHeight: "60px" }}></div>
        <button 
          style={btn} 
          onClick={() => alert("Aguarde o botão azul do PayPal aparecer!")}
        >
          Pagar com PayPal, Cartão ou Pix
        </button>
      </div>

      <div style={cardStyle}>
        <img
          src="/video.gif"
          alt="Vídeo 30s"
          style={{ width: "100%", borderRadius: "10px", marginBottom: "15px" }}
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/400x200/28a745/ffffff?text=Vídeo+30s";
          }}
        />
        <h3>VÍDEO 30s — R$ 10,00</h3>
        <p style={{ fontSize: "12px", color: "#666" }}>
          OrderID: {orderIdVideo.substring(0, 15)}...
        </p>
        <div id="paypal-video" style={{ marginTop: "20px", minHeight: "60px" }}></div>
        <button 
          style={btn} 
          onClick={() => alert("Aguarde o botão azul do PayPal aparecer!")}
        >
          Pagar com PayPal, Cartão ou Pix
        </button>
      </div>
      
      <div style={{ 
        marginTop: "30px", 
        padding: "15px", 
        background: "#e8f4fd", 
        borderRadius: "10px",
        fontSize: "14px"
      }}>
        <p><strong>💡 Como funciona agora:</strong></p>
        <ol style={{ textAlign: "left", marginLeft: "20px" }}>
          <li>Cada pedido gera um ID único</li>
          <li>PayPal guarda esse ID</li>
          <li>Quando pagar, o webhook recebe o ID</li>
          <li>Sistema encontra seu pedido pelo ID</li>
          <li>Tudo sincronizado! 🎯</li>
        </ol>
      </div>
    </div>
  );
};

const cardStyle = {
  backgroundColor: "#f8f9fa",
  padding: "20px",
  borderRadius: "10px",
  margin: "20px 0",
  border: "2px solid #e9ecef",
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
