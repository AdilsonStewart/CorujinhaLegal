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
  const [foundClient, setFoundClient] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

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
        setFoundClient({ id: client.id, data: client });

        setStatusMessage(
          `Ok — encontramos ${client.nome || "cliente"}.`
        );

        localStorage.setItem("clienteId", client.id);
        localStorage.setItem("clienteNome", client.nome || "");
        localStorage.setItem("clienteTelefone", telClean);
      } else {
        setFoundClient(null);
        setStatusMessage("Cliente não encontrado. Deseja criar uma conta com esses dados?");
      }
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao procurar o cliente.");
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

      localStorage.setItem("clienteId", ref.id);
      localStorage.setItem("clienteNome", nome || "");
      localStorage.setItem("clienteTelefone", telClean);

      setFoundClient({ id: ref.id, data: payload });

      setStatusMessage(`Conta criada! Bem-vindo(a), ${nome || "cliente"}.`);
    } catch (err) {
      console.error("create client error:", err);
      alert("Erro ao criar cliente.");
    } finally {
      setLoading(false);
    }
  };

  const goToMessages = () => {
    window.location.href = "/minhas-mensagens";
  };

  const goToSend = () => {
    window.location.href = "/";
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>
        <img
          src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTZycHZycGcxeTB1aDE1OWR0OGlxNHd2cGgycTB5MHF3MThtbjVlciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/rVY6OYHpnJNln3SwFu/giphy.gif"
          alt="Corujinha"
          style={{ width: "40px", height: "40px", marginRight: 10, verticalAlign: "middle" }}
        />
        Sou cliente
      </h2>

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

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 18px",
            fontSize: 16,
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          {loading ? "Procurando..." : "Procurar"}
        </button>
      </form>

      {statusMessage && (
        <div style={{ marginTop: 16, padding: 12, background: "#f1f1f1", borderRadius: 8 }}>
          <strong>{statusMessage}</strong>
        </div>
      )}

      {foundClient && (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <div>Nome: <strong>{foundClient.data.nome || "—"}</strong></div>
          <div>Telefone: <strong>{foundClient.data.telefone || telefone}</strong></div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              onClick={goToMessages}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "#17a2b8",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer"
              }}
            >
              Ver minha lista
            </button>

            <button
              onClick={goToSend}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer"
              }}
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
