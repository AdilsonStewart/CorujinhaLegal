import React from "react";
import { useNavigate } from "react-router-dom";
import './OrfeuIntro.css'; // Se quiser customizar depois

export default function OrfeuIntro() {
  const navigate = useNavigate();

  const handlePagamento = (tipo) => {
    const valor = tipo === "audio" ? 5.00 : 10.00;

    // Salva o tipo no localStorage para referência depois
    localStorage.setItem("tipoSelecionado", tipo);

    // Redireciona para a página de pagamento
    navigate(`/servicos?tipo=${tipo}&valor=${valor}`);
  };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <div className="orfeu-gif-container">
        <img
          src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXIyZ2p3cmt2ZmZhenFtbndyOHlnamdnZG05ZjNnNG5hdnJoNHRzYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Gb4EpNvhkIO6HSiotj/giphy.gif"
          alt="Orfeu Corujinha"
          className="orfeu-gif"
        />
      </div>

      <h2>Olá! Eu sou o Orfeu 🦉</h2>
      <p style={{ maxWidth: 400, margin: "0 auto", marginTop: 15 }}>
        Seu amigo Orfeu vai gravar sua mensagem e entregar para aquela pessoa no dia, mês e hora que você disser.
      </p>
      <p style={{ maxWidth: 400, margin: "0 auto", marginTop: 10 }}>
        Escolha uma das opções abaixo para começar:
      </p>

      <div style={{ marginTop: 30 }}>
        <button
          onClick={() => handlePagamento("audio")}
          style={{
            padding: "15px 25px",
            margin: "10px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "18px",
            cursor: "pointer"
          }}
        >
          🎤 Áudio - R$5
        </button>

        <button
          onClick={() => handlePagamento("video")}
          style={{
            padding: "15px 25px",
            margin: "10px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "18px",
            cursor: "pointer"
          }}
        >
          📹 Vídeo - R$10
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => navigate("/livre-record")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer"
          }}
        >
          ⏱ Gravação Livre
        </button>
      </div>
    </div>
  );
}
