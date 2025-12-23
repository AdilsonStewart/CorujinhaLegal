import React, { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const ClientIdentifyPage = () => {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");

    const telClean = sanitizePhone(telefone);

    if (!nome.trim()) {
      alert("Informe seu nome.");
      return;
    }

    if (!telClean || telClean.length < 10) {
      alert("Telefone inválido. Ex: 11999998888");
      return;
    }

    if (!nascimento) {
      alert("Informe sua data de nascimento.");
      return;
    }

    if (!senha || !confirmaSenha) {
      alert("Informe e confirme sua senha.");
      return;
    }

    if (senha !== confirmaSenha) {
      alert("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      // 🔎 Verifica se o cliente já existe
      const q = query(
        collection(db, "clientes"),
        where("telefone", "==", telClean)
      );
      const snap = await getDocs(q);

      // 🟢 CLIENTE JÁ EXISTE → validar senha
      if (!snap.empty) {
        const cliente = snap.docs[0].data();

        if (cliente.senha !== senha) {
          alert("Senha incorreta.");
          setLoading(false);
          return;
        }

        // login ok
        localStorage.setItem("clienteTelefone", telClean);
        localStorage.setItem("clienteNome", cliente.nome);

        window.location.href = "/servicos";
        return;
      }

      // 🆕 NOVO CLIENTE → criar cadastro
      await addDoc(collection(db, "clientes"), {
        nome,
        telefone: telClean,
        nascimento,
        senha,
        criado_em: new Date().toISOString()
      });

      localStorage.setItem("clienteTelefone", telClean);
      localStorage.setItem("clienteNome", nome);

      window.location.href = "/servicos";

    } catch (err) {
      console.error(err);
      alert("Erro ao processar seu cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>Olá, que bom te ter aqui!</h2>
      <p>Para sua segurança, faça um pequeno cadastro e gere uma senha.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>

        <input
          type="text"
          placeholder="Seu nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Telefone com DDD"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <label>Data de nascimento</label>
        <input
          type="date"
          value={nascimento}
          onChange={(e) => setNascimento(e.target.value)}
        />

        <input
          type="password"
          placeholder="Crie uma senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirme sua senha"
          value={confirmaSenha}
          onChange={(e) => setConfirmaSenha(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Processando..." : "Continuar"}
        </button>

      </form>

      {statusMessage && (
        <div style={{ marginTop: 16 }}>
          <strong>{statusMessage}</strong>
        </div>
      )}
    </div>
  );
};

export default ClientIdentifyPage;
