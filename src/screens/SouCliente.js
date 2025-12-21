import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import "./Clientes.css";

function Clientes() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [clienteAchado, setClienteAchado] = useState(null);

  const fazerLoginCliente = async (e) => {
    e.preventDefault();
    setErro("");

    if (!telefone.trim()) {
      setErro("Digite seu telefone.");
      return;
    }

    const telLimpo = telefone.replace(/\D/g, "");
    if (telLimpo.length < 10) {
      setErro("Telefone inválido. Use DDD, ex: 11999998888");
      return;
    }

    setCarregando(true);

    try {
      // Primeiro tentar telefone_remetente
      const q1 = query(
        collection(db, "agendamentos"),
        where("telefone_remetente", "==", telLimpo)
      );
      const snap1 = await getDocs(q1);
      let mensagens = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Se não encontrar nada, tenta telefone
      if (mensagens.length === 0) {
        const q2 = query(
          collection(db, "agendamentos"),
          where("telefone", "==", telLimpo)
        );
        const snap2 = await getDocs(q2);
        mensagens = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      setClienteAchado({
        nome: nome || (mensagens[0]?.remetente ?? "Cliente"),
        telefone: telLimpo,
        quantidade: mensagens.length
      });

      localStorage.setItem("clienteNome", nome);
      localStorage.setItem("clienteTelefone", telLimpo);

    } catch (e) {
      setErro("Erro ao buscar mensagens.");
      console.error(e);
    }

    setCarregando(false);
  };

  return (
    <div className="clientes-container">
      <header className="clientes-header">
        <h1>Corujinha — Sou Cliente</h1>
      </header>

      <form onSubmit={fazerLoginCliente} style={{ marginTop: 20 }}>
        <label>Seu nome (opcional)</label>
        <input 
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
        />

        <label>Seu telefone</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="11999998888"
        />

        <button type="submit" disabled={carregando}>
          {carregando ? "Buscando..." : "Procurar"}
        </button>

        {erro && <p style={{ color: "red" }}>{erro}</p>}
      </form>

      {clienteAchado && (
        <div style={{ marginTop: 20 }}>
          <p>
            Ok — encontramos <b>{clienteAchado.nome}</b>.<br />
            Você tem{" "}
            <b>
              {clienteAchado.quantidade}{" "}
              {clienteAchado.quantidade === 1 ? "mensagem" : "mensagens"}
            </b>.
          </p>

          <button
            onClick={() => navigate("/minhas-mensagens")}
            style={{ marginTop: 10 }}
          >
            Ver minha lista
          </button>

          <button
            onClick={() => navigate("/servicos")}
            style={{ marginTop: 10, marginLeft: 10 }}
          >
            Enviar nova mensagem
          </button>
        </div>
      )}
    </div>
  );
}

export default Clientes;

