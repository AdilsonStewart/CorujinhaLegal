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
  // 🔐 LOGIN (somente telefone + senha)
  const [loginTelefone, setLoginTelefone] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  // 🆕 CADASTRO
  const [cadNome, setCadNome] = useState("");
  const [cadTelefone, setCadTelefone] = useState("");
  const [cadNascimento, setCadNascimento] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [cadConfirmaSenha, setCadConfirmaSenha] = useState("");

  const [loading, setLoading] = useState(false);

  // 🔐 CLIENTE EXISTENTE → LOGIN
  const entrarCliente = async () => {
    const telClean = sanitizePhone(loginTelefone);

    if (!telClean || telClean.length < 10) {
      alert("Informe o telefone cadastrado com DDD.");
      return;
    }

    if (!loginSenha) {
      alert("Informe sua senha.");
      return;
    }

    setLoading(true);

    try {
      const q = query(
        collection(db, "Clientes"),
        where("telefone", "==", telClean)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Telefone não encontrado. Faça o cadastro abaixo.");
        return;
      }

      const cliente = snap.docs[0].data();

      if (cliente.senha !== loginSenha) {
        alert("Senha incorreta.");
        return;
      }

      // ✅ LOGIN OK
      localStorage.setItem("clienteTelefone", telClean);
      localStorage.setItem("clienteNome", cliente.nome || "");

      window.location.href = "/minhas-mensagens";

    } catch (err) {
      console.error("ERRO LOGIN:", err);
      alert("Erro ao validar acesso.");
    } finally {
      setLoading(false);
    }
  };

  // 🆕 NOVO CLIENTE → CADASTRO
  const cadastrarNovoCliente = async (e) => {
    e.preventDefault();

    const telClean = sanitizePhone(cadTelefone);

    if (!cadNome.trim()) {
      alert("Informe seu nome.");
      return;
    }

    if (!telClean || telClean.length < 10) {
      alert("Telefone inválido.");
      return;
    }

    if (!cadNascimento) {
      alert("Informe sua data de nascimento.");
      return;
    }

    if (!cadSenha || !cadConfirmaSenha) {
      alert("Crie e confirme sua senha.");
      return;
    }

    if (cadSenha !== cadConfirmaSenha) {
      alert("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "Clientes"), {
        nome: cadNome,
        telefone: telClean,
        nascimento: cadNascimento,
        senha: cadSenha,
        criado_em: new Date().toISOString()
      });

      localStorage.setItem("clienteTelefone", telClean);
      localStorage.setItem("clienteNome", cadNome);

      window.location.href = "/servicos";

    } catch (err) {
      console.error("ERRO CADASTRO:", err);
      alert("Erro ao criar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>Olá, que bom te ter aqui!</h2>
      <p>Para sua segurança, acesse com sua senha ou faça um pequeno cadastro.</p>

      {/* 🔐 JÁ SOU CLIENTE */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 8
        }}
      >
        <strong>Já sou cliente</strong>

        <input
          type="tel"
          placeholder="Telefone cadastrado (com DDD)"
          value={loginTelefone}
          onChange={(e) => setLoginTelefone(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <input
          type="password"
          placeholder="Sua senha"
          value={loginSenha}
          onChange={(e) => setLoginSenha(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <button
          onClick={entrarCliente}
          disabled={loading}
          style={{ marginTop: 12, width: "100%" }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>

      <hr />

      {/* 🆕 PRIMEIRO ACESSO */}
      <form
        onSubmit={cadastrarNovoCliente}
        style={{ display: "grid", gap: 12, marginTop: 20 }}
      >
        <strong>Primeiro acesso</strong>

        <input
          type="text"
          placeholder="Seu nome completo"
          value={cadNome}
          onChange={(e) => setCadNome(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Telefone com DDD"
          value={cadTelefone}
          onChange={(e) => setCadTelefone(e.target.value)}
        />

        <label>Data de nascimento</label>
        <input
          type="date"
          value={cadNascimento}
          onChange={(e) => setCadNascimento(e.target.value)}
        />

        <input
          type="password"
          placeholder="Crie uma senha"
          value={cadSenha}
          onChange={(e) => setCadSenha(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirme sua senha"
          value={cadConfirmaSenha}
          onChange={(e) => setCadConfirmaSenha(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Criando cadastro..." : "Continuar"}
        </button>
      </form>
    </div>
  );
};

export default ClientIdentifyPage;
