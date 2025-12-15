import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const ClientIdentifyPage = () => {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundClient, setFoundClient] = useState(null); // { id, data }
  const [messageCount, setMessageCount] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // procura cliente por telefone na coleção 'clientes'
  const findClientByPhone = async (tel) => {
    try {
      const q = query(collection(db, "clientes"), where("telefone", "==", tel));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
      }
      return null;
    } catch (e) {
      console.error("findClientByPhone error:", e);
      throw e;
    }
  };

  // conta agendamentos associados ao cliente (assumindo campo cliente_id nos docs 'agendamentos')
  const countClientAgendamentos = async (clientId) => {
    try {
      const q = query(collection(db, "agendamentos"), where("cliente_id", "==", clientId));
      const snap = await getDocs(q);
      return snap.size;
    } catch (e) {
      console.error("countClientAgendamentos error:", e);
      return 0;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    const telClean = sanitizePhone(telefone);
    if (!telClean || telClean.length < 10) {
      alert("Por favor, informe um telefone válido com DDD (ex: 11999999999).");
      return;
    }
    setLoading(true);
    try {
      const client = await findClientByPhone(telClean);
      if (client) {
        // encontrado
        setFoundClient({ id: client.id, data: client });
        const count = await countClientAgendamentos(client.id);
        setMessageCount(count);
        setStatusMessage(`Ok — encontramos ${client.nome || "cliente"} (ID: ${client.id}). Você tem ${count} mensagem(ns).`);
        // salvar no localStorage para prefill nas demais telas
        localStorage.setItem("clienteId", client.id);
        localStorage.setItem("clienteNome", client.nome || "");
        localStorage.setItem("clienteTelefone", telClean);
      } else {
        // não encontrado
        setFoundClient(null);
        setMessageCount(0);
        setStatusMessage("Cliente não encontrado. Deseja criar uma conta com esses dados?");
      }
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao procurar o cliente. Veja o console.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    const telClean = sanitizePhone(telefone);
    if (!telClean || telClean.length < 10) {
      alert("Telefone inválido.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        nome: nome || null,
        telefone: telClean,
        criadoEm: new Date().toISOString()
      };
      const ref = await addDoc(collection(db, "clientes"), payload);
      // save local
      localStorage.setItem("clienteId", ref.id);
      localStorage.setItem("clienteNome", nome || "");
      localStorage.setItem("clienteTelephone", telClean);
      setFoundClient({ id: ref.id, data: payload });
      setMessageCount(0);
      setStatusMessage(`Conta criada! Bem-vindo(a), ${nome || "cliente"}.`);
    } catch (err) {
      console.error("create client error:", err);
      alert("Erro ao criar cliente. Veja o console.");
    } finally {
      setLoading(false);
    }
  };

  const goToMessages = () => {
    // ajustar rota se necessário
    window.location.href = "/minhas-mensagens";
  };

  const goToSend = () => {
    // escolher se vai para audio ou video — aqui envio para seleção de novo envio
    window.location.href = "/"; // ajustar para a página principal de envio ou específica
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>👋 Sou cliente</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          type="text"
          placeholder="Seu nome (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="tel"
          placeholder="Seu telefone com DDD *"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}
        />

        <button type="submit" disabled={loading} style={{ padding: "12px 18px", fontSize: 16, background: "#007bff", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {loading ? "Procurando..." : "Procurar"}
        </button>
      </form>

      {statusMessage && (
        <div style={{ marginTop: 16, padding: 12, background: "#f1f1f1", borderRadius: 8 }}>
          <strong>{statusMessage}</strong>
        </div>
      )}

      {foundClient ? (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <div>Nome: <strong>{foundClient.data.nome || "—"}</strong></div>
          <div>Telefone: <strong>{foundClient.data.telefone || telefone}</strong></div>
          <div>Mensagens encontradas: <strong>{messageCount !== null ? messageCount : "—"}</strong></div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={goToMessages} style={{ flex: 1, padding: "10px 12px", background: "#17a2b8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
              Ver minha lista
            </button>
            <button onClick={goToSend} style={{ flex: 1, padding: "10px 12px", background: "#28a745", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
              Enviar nova mensagem
            </button>
          </div>
        </div>
      ) : (
        // não encontrado -> sugere criar
        statusMessage && statusMessage.includes("não encontrado") && (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div>Seus dados não foram encontrados. Deseja criar uma conta simples para facilitar envios futuros?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCreateClient} disabled={loading} style={{ flex: 1, padding: "10px 12px", background: "#ffc107", color: "#222", border: "none", borderRadius: 8, cursor: "pointer" }}>
                {loading ? "Criando..." : "Criar Conta"}
              </button>
              <button onClick={() => { setStatusMessage(""); setNome(""); setTelefone(""); }} style={{ flex: 1, padding: "10px 12px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ClientIdentifyPage;
