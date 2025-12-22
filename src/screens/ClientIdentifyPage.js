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
  const [senha, setSenha] = useState(""); // ⭐
  const [loading, setLoading] = useState(false);
  const [foundClient, setFoundClient] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [senhaValida, setSenhaValida] = useState(false); // ⭐

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");

    const telClean = sanitizePhone(telefone);

    if (!telClean || telClean.length < 10) {
      alert("Telefone inválido. Ex: 11999998888");
      return;
    }

    if (!senha.trim()) {
      alert("Digite sua senha.");
      return;
    }

    setLoading(true);

    try {
      // ⭐ consulta a coleção AGENDAMENTOS
      const q = query(
        collection(db, "agendamentos"),
        where("telefone_remetente", "==", telClean)
      );

      const snap = await getDocs(q);

      let registros = snap.docs;

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
        setStatusMessage("Nenhuma mensagem encontrada para este telefone.");
        setLoading(false);
        return;
      }

      // ⭐ pegar o primeiro agendamento registrado
      const dados = registros[0].data();

      // ⭐ validar senha
      if (dados.senha !== senha) {
        setStatusMessage("Senha incorreta.");
        setFoundClient(null);
        setSenhaValida(false);
        setLoading(false);
        return;
      }

      // ⭐ senha ok
      setSenhaValida(true);

      setFoundClient({
        nome: dados.remetente || nome,
        telefone: telClean
      });

      localStorage.setItem("clienteTelefone", telClean);
      localStorage.setItem("clienteNome", dados.remetente || nome);

      setStatusMessage(`Bem-vindo, ${dados.remetente || "cliente"}.`);

    } catch (err) {
      console.error(err);
      alert("Erro ao validar acesso.");
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
          placeholder="Seu telefone *"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        {/* ⭐ campo de senha */}
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

      {foundClient && senhaValida && (
        <div style={{ marginTop: 14 }}>
          <div>Nome: <strong>{foundClient.nome}</strong></div>
          <div>Telefone: <strong>{foundClient.telefone}</strong></div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={goToMessages}>Ver minha lista</button>
            <button onClick={goToSend}>Enviar nova mensagem</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientIdentifyPage;
