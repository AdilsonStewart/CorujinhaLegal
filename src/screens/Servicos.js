import React, { useEffect, useRef, useState } from "react";

const Servicos = () => {
  const paypalLoaded = useRef(false);
  const [orderIdAudio, setOrderIdAudio] = useState("");
  const [orderIdVideo, setOrderIdVideo] = useState("");

  // Gerar orderIDs únicos quando carregar
  useEffect(() => {
    const audioId = `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setOrderIdAudio(audioId);
    
    const videoId = `VIDEO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setOrderIdVideo(videoId);
    
    console.log("🎫 OrderIDs gerados:", { audioId, videoId });
    
    localStorage.setItem("lastOrderIdAudio", audioId);
    localStorage.setItem("lastOrderIdVideo", videoId);
  }, []);

  // Carregar PayPal APÓS a página renderizar
  useEffect(() => {
    if (paypalLoaded.current) return;

    // Aguardar um pouco para garantir que o DOM está pronto
    const timer = setTimeout(() => {
      const script = document.createElement("script");
      script.src = "https://www.paypal.com/sdk/js?client-id=AWcGR2Fa2OoZ8lTaDiGTIvQh0q7t-OPAZun6x3ixjad1CYn-CMc0Sp8Xm3NtGF6JvSJpZK9_Sd4b4Pqb&currency=BRL";
      script.async = true;
      
      script.onload = () => {
        if (window.paypal && !paypalLoaded.current) {
          
          // 🎤 BOTÃO ÁUDIO R$5
          if (document.getElementById('paypal-audio')) {
            window.paypal.Buttons({
              createOrder: (data, actions) => {
                console.log("🎤 Criando pedido ÁUDIO:", orderIdAudio);
                return actions.order.create({
                  purchase_units: [{
                    description: "Áudio 30s - CorujinhaLegal",
                    amount: { currency_code: "BRL", value: "5.00" },
                    custom_id: orderIdAudio,
                  }]
                });
              },
              onApprove: (data, actions) => {
                return actions.order.capture().then((details) => {
                  console.log("✅ Pagamento ÁUDIO aprovado:", {
                    orderIdPayPal: data.orderID,
                    nossoOrderId: orderIdAudio,
                    details
                  });
                  
                  // ⚠️ URL CORRETA E COMPLETA
                  window.location.href = `/retorno?tipo=audio&status=success&orderID=${orderIdAudio}&paypalOrderID=${data.orderID}`;
                });
              },
              onError: (err) => {
                console.error("Erro no pagamento ÁUDIO:", err);
                alert("Ops, erro no PayPal. Tente de novo!");
              }
            }).render("#paypal-audio");
          } else {
            console.error("❌ Elemento #paypal-audio não encontrado!");
          }

          // 🎥 BOTÃO VÍDEO R$10
          if (document.getElementById('paypal-video')) {
            window.paypal.Buttons({
              createOrder: (data, actions) => {
                console.log("🎥 Criando pedido VÍDEO:", orderIdVideo);
                return actions.order.create({
                  purchase_units: [{
                    description: "Vídeo 30s - CorujinhaLegal",
                    amount: { currency_code: "BRL", value: "10.00" },
                    custom_id: orderIdVideo,
                  }]
                });
              },
              onApprove: (data, actions) => {
                return actions.order.capture().then((details) => {
                  console.log("✅ Pagamento VÍDEO aprovado:", {
                    orderIdPayPal: data.orderID,
                    nossoOrderId: orderIdVideo,
                    details
                  });
                  
                  // ⚠️ URL CORRETA E COMPLETA
                  window.location.href = `/retorno?tipo=video&status=success&orderID=${orderIdVideo}&paypalOrderID=${data.orderID}`;
                });
              },
              onError: (err) => {
                console.error("Erro no pagamento VÍDEO:", err);
                alert("Ops, erro no PayPal. Tente de novo!");
              }
            }).render("#paypal-video");
          } else {
            console.error("❌ Elemento #paypal-video não encontrado!");
          }
          
          paypalLoaded.current = true;
        }
      };
      
      document.head.appendChild(script);
    }, 500); // Aguarda 0.5 segundos para React renderizar

    return () => clearTimeout(timer);
  }, [orderIdAudio, orderIdVideo]);

  // ⚠️ IMPORTANTE: Mantenha o HTML IGUAL ao que você tinha antes!
  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", textAlign: "center" }}>
      <h2>Escolha seu serviço</h2>
      
      <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", margin: "20px 0" }}>
        <div style={{ 
          width: "100%", 
          height: "200px", 
          background: "#007bff",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "15px"
        }}>
          🎤 ÁUDIO 30s
        </div>
        <h3>ÁUDIO 30s — R$ 5,00</h3>
        <p style={{ fontSize: "12px", color: "#666", fontFamily: "monospace" }}>
          ID: {orderIdAudio.substring(0, 20)}...
        </p>
        {/* ⚠️ ESTE DIV DEVE EXISTIR para o PayPal */}
        <div id="paypal-audio" style={{ marginTop: "20px", minHeight: "60px" }}></div>
      </div>
      
      <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", margin: "20px 0" }}>
        <div style={{ 
          width: "100%", 
          height: "200px", 
          background: "#28a745",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "15px"
        }}>
          🎥 VÍDEO 30s
        </div>
        <h3>VÍDEO 30s — R$ 10,00</h3>
        <p style={{ fontSize: "12px", color: "#666", fontFamily: "monospace" }}>
          ID: {orderIdVideo.substring(0, 20)}...
        </p>
        {/* ⚠️ ESTE DIV DEVE EXISTIR para o PayPal */}
        <div id="paypal-video" style={{ marginTop: "20px", minHeight: "60px" }}></div>
      </div>
      
      <div style={{ 
        marginTop: "20px", 
        padding: "15px", 
        background: "#fff3cd", 
        borderRadius: "10px",
        fontSize: "14px",
        color: "#856404",
        border: "1px solid #ffeaa7"
      }}>
        <p style={{ margin: "0", fontWeight: "bold" }}>💡 Importante:</p>
        <p style={{ margin: "5px 0 0 0" }}>
          Cada pedido tem um ID único acima. O PayPal guarda esse ID e depois nosso sistema encontra pelo mesmo ID.
        </p>
      </div>
    </div>
  );
};

export default Servicos;
