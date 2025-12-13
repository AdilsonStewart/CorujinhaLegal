import React from "react";
import { useNavigate } from "react-router-dom";

export default function OrfeuIntro() {
  const navigate = useNavigate();

  return (
    <div style={{
      padding: 20,
      textAlign: "center",
      maxWidth: 600,
      margin: "0 auto",
      fontFamily: "Arial, sans-serif"
    }}>
      <h2>👋 Olá! Eu sou o Orfeu</h2>
      <p>
        Sou seu amigo Orfeu e vou cuidar da sua mensagem e garantir que ela chegue no momento certo..
      </p>

      <img
        src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXIyZ2p3cmt2ZmZhenFtbndyOHlnamdnZG05ZjNnNG5hdnJoNHRzYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Gb4EpNvhkIO6HSiotj/giphy.gif"
        alt="Orfeu GIF"
        style={{ width: "100%", maxWidth: 300, margin: "20px 0" }}
      />

      <p>
        Para começar, escolha uma das opções de gravação que deseja:
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 20 }}>
        <button
          onClick={() => navigate("/audiorecord")}
          style={{
            padding: "15px 25px",
            fontSize: "16px",
            borderRadius: "10px",
            border: "none",
            background: "#28a745",
            color: "white",
            cursor: "pointer"
          }}
        >
          Áudio (30s)
        </button>

        <button
          onClick={() => navigate("/videorecord")}
          style={{
            padding: "15px 25px",
            fontSize: "16px",
            borderRadius: "10px",
            border: "none",
            background: "#007bff",
            color: "white",
            cursor: "pointer"
          }}
        >
          Vídeo (30s)
        </button>
      </div>

      <p style={{ marginTop: 30, fontSize: "14px", color: "#555" }}>
        Lembrando: são até 30 segundos. Se precisar de mais tempo, acesse a opção
        <b> Gravação livre</b>.
      </p>
    </div>
  );
}
