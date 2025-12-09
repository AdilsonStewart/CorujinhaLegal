import React, { useState } from "react";
import "./SouCliente.css";
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function SouCliente() {
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleCheck = async (e) => {
    e.preventDefault();
    setErro("");

    try {
      const ref = doc(db, "clientes", telefone);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setErro("❌ Não encontramos cadastro com esse telefone.");
        return;
      }

      navigate("/servicos");
    } catch (error) {
      console.error(error);
      setErro("Erro ao verificar cadastro.");
    }
  };

  return (
    <div className="soucliente-container">
      <h1>Sou Cliente</h1>

      <form onSubmit={handleCheck}>
        <input
          type="text"
          placeholder="Seu telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <button type="submit">Entrar</button>
      </form>

      {erro && (
        <div className="erro-bloco">
          <p>{erro}</p>
          <button onClick={() => navigate("/cadastro")}>Voltar</button>
        </div>
      )}
    </div>
  );
}
