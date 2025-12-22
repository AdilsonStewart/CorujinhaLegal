import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const ClientIdentifyPage = () => {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState(""); // ⭐ ADICIONADO
  const [loading, setLoading] = useState(false);
  const [foundClient, setFoundClient] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [senhaValida, setSenhaValida] = useState(false); // ⭐ ADICIONADO

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");

    const telClean = sanitizePhone(telefone);

    if (!telClean || telClean.length < 10) {
      alert("Telefone inválido. Ex: 11999998888");
      return;
    }

    if (!senha.trim()) {
      alert("Informe sua senha.");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ busca pelo remetente
      const q1 = query(
        collection(db, "agendamentos"),
        where("telefone_remetente", "==", telClean)
      );
      const snap1 = await getDocs(q1);

      let registros = snap1.docs;

      // 2️⃣ se não achou, busca pelo destinatário
      if (registros.length === 0) {
        const q2 = query(
          collection(db, "agendamentos"),
          where("telefone_destinatario", "==", telClean)
        );
        const snap2 = await getDocs(q2);
        registros = snap2.docs;
      }

      if (registros.length === 0) {
        setFoundClient(null);
        setSenhaValida(false);
        setStatusMessage("Nenhuma mensagem encontrada com este telefone.");
        setLoading(false);
        return;
      }

      // usa o primeiro agendamento encontrado
      const dados = registros[0].data();

      // ⭐ valida senha
      if (dados.senha !== senha) {
        setFoundClient(null);
        setSenhaValida(false);
        setStatusMessage("Senha incorreta.");
        setLoading(false);
        return;
      }

      // ⭐ senha OK
      setSenhaValida(true);

      setFoundClient({
        nome: dados.remetente || nome || "Cliente",
        telefone: telClean
      });

      localStorage.setItem("clienteTelefone", telClean);
      localStorage.setItem("clienteNome", dados.remetente || nome);

      setStatusMessage(`Bem-vindo, ${dados.remetente || "cliente"}.`);

    } catch (err) {
      console.error(err);
      alert("Erro ao validar.");
    } finally {
      setLoading(false);
    }
  };

  const goToMessages = () => {
    if (!senhaValida) return;
    window.location.href = "/minhas-mensagens";
  };

  const goToSend = () => {
    if (!senhaValida) return;
    window.location.href = "/";
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>Sou cliente</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          type="text"
          placeholder="Seu nome (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Seu telefone com DDD *"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        {/* ⭐ CAMPO SENHA */}
        <input
          type="password"
          placeholder="Sua senha *"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Validando..." : "Entrar"}
        </button>
      </form>

      {statusMessage && (
        <div style={{ marginTop: 16 }}>
          <strong>{statusMessage}</strong>
        </div>
      )}

      {/* ⭐ SÓ MOSTRA SE SENHA VALIDADA */}
      {foundClient && senhaValida && (
        <div style={{ marginTop: 14 }}>
          <div>Nome: <strong>{foundClient.nome}</strong></div>
          <div>Telefone: <strong>{foundClient.telefone}</strong></div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button
              onClick={goToMessages}
              style={{ flex: 1 }}
            >
              Ver minha lista
            </button>

            <button
              onClick={goToSend}
              style={{ flex: 1 }}
            >
              Enviar nova mensagem
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientIdentifyPage;
