import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const Servicos = () => {
  const paypalLoaded = useRef(false);
  const [orderIdAudio, setOrderIdAudio] = useState("");
  const [orderIdVideo, setOrderIdVideo] = useState("");
  const navigate = useNavigate();

  // Gerar orderIDs únicos
  useEffect(() => {
    const audioId = `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const videoId = `VIDEO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setOrderIdAudio(audioId);
    setOrderIdVideo(videoId);
    
    localStorage.setItem("lastOrderIdAudio", audioId);
    localStorage.setItem("lastOrderIdVideo", videoId);
    
    console.log("🎫 OrderIDs gerados:", { audio: audioId, video: videoId });
  }, []);

  useEffect(() => {
    if (paypalLoaded.current) return;

    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=AWcGR2Fa2OoZ8lTaDiGTIvQh0q7t-OPAZun6x3ixjad1CYn-CMc0Sp8Xm3NtGF6JvSJpZK9_Sd4b4Pqb&currency=BRL";
    script.async = true;
    
    script.onload = () => {
      if (window.paypal && !paypalLoaded.current) {
        
        // 🎤 BOTÃO ÁUDIO R$5
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
              console.log("✅ Pagamento ÁUDIO aprovado!", {
                nossoOrderId: orderIdAudio,
                paypalOrderID: data.orderID,
                details
              });
              
              // ⚠️ URL COMPLETA COM TODOS PARÂMETROS
              window.location.href = `/retorno?tipo=audio&status=success&orderID=${orderIdAudio}&paypalOrderID=${data.orderID}`;
            });
          },
          onError: (err) => {
            console.error("Erro no pagamento ÁUDIO:", err);
            alert("Ops, erro no PayPal. Tente de novo!");
          }
        }).render("#paypal-audio");

        // 🎥 BOTÃO VÍDEO R$10
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
              console.log("✅ Pagamento VÍDEO aprovado!", {
                nossoOrderId: orderIdVideo,
                paypalOrderID: data.orderID,
                details
              });
              
              // ⚠️ URL COMPLETA COM TODOS PARÂMETROS
              window.location.href = `/retorno?tipo=video&status=success&orderID=${orderIdVideo}&paypalOrderID=${data.orderID}`;
            });
          },
          onError: (err) => {
            console.error("Erro no pagamento VÍDEO:", err);
            alert("Ops, erro no PayPal. Tente de novo!");
          }
        }).render("#paypal-video");
        
        paypalLoaded.current = true;
      }
    };
    
    document.head.appendChild(script);
  }, [orderIdAudio, orderIdVideo]);

  // ... (mantenha o resto do seu JSX igual) ...
  // O HTML/JSX da página fica IGUAL ao que você já tem
};

export default Servicos;
