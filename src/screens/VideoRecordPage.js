useEffect(() => {
    // Se já inicializou, não faz nada
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
      // Limpeza: remove o script se o componente for desmontado
      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // Reseta a flag de inicialização se o componente for desmontado
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
          // ✅ REDIRECIONA COM TIPO CORRETO - URL relativa
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
          // ✅ REDIRECIONA COM TIPO CORRETO - URL relativa
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
        <div id="paypal-video" style={{ marginTop: "20px", minHeight: "60px" }}></div>
        <button 
          style={btn} 
          onClick={() => alert("Aguarde o botão azul do PayPal aparecer!")}
        >
          Pagar com PayPal, Cartão ou Pix
        </button>
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
