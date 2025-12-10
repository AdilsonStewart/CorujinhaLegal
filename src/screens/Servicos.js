import React, { useEffect, useRef } from "react";

const Servicos = () => {
  const paypalLoaded = useRef(false);

  useEffect(() => {
    if (paypalLoaded.current) return;

    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=AWcGR2Fa2OoZ8lTaDiGTIvQh0q7t-OPAZun6x3ixjad1CYn-CMc0Sp8Xm3NtGF6JvSJpZK9_Sd4b4Pqb&currency=BRL";
    script.async = true;
    
    script.onload = () => {
      if (window.paypal && !paypalLoaded.current) {
        window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                description: "Áudio 30s - CorujinhaLegal",
                amount: { currency_code: "BRL", value: "5.00" }
              }]
            });
          },
          onApprove: (data, actions) => {
            return actions.order.capture().then(() => {
              window.location.href = "/retorno?tipo=audio&status=success";
            });
          }
        }).render("#paypal-audio");

        window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                description: "Vídeo 30s - CorujinhaLegal",
                amount: { currency_code: "BRL", value: "10.00" }
              }]
            });
          },
          onApprove: (data, actions) => {
            return actions.order.capture().then(() => {
              window.location.href = "/retorno?tipo=video&status=success";
            });
          }
        }).render("#paypal-video");
        
        paypalLoaded.current = true;
      }
    };
    
    document.head.appendChild(script);
  }, []);

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
        <div id="paypal-video" style={{ marginTop: "20px", minHeight: "60px" }}></div>
      </div>
    </div>
  );
};

export default Servicos;
