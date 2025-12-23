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
  const [modoExistente, setModoExistente] = useState(false);

  const validarClienteExistente = async () => {
    const telClean = sanitizePhone(telefone);

    if (!telClean || telClean.length < 10) {
      alert("Informe seu telefone com DDD.");
      return;
    }

    if (!senha) {
      alert("Informe sua senha.");
      return;
    }

    setLoading(true);

    try {
      const q = query(
        collection(db, "clientes"),
        where("telefone", "==", telClean)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Cliente não encontrado. Complete o cadastro abaixo.");
        setModoExistente(false);
        setLoading(false);
        return;
      }

      const cliente = snap.docs[0].data();

      if (cliente.senha !== senha) {
        alert("Senha incorreta.");
        setLoading(false);
        return;
      }

      // login OK
      localStorage.setItem("clienteTelefone", telClean);
      localStorage.setItem("clienteNome", cliente.nome);

      window.location.href = "/servicos";

    } catch (err) {
      console.error(err);
      alert("Erro ao validar cliente.");
    } finally {
      setLoading(false);
    }
  };

  const cadastrarNovoCliente = async (e) => {
    e.preventDefault();

    const telClean = sanitizePhone(telefone);

    if (!nome.trim()) {
      alert("Informe seu nome.");
      return;
    }

    if (!telClean || telClean.length < 10) {
      alert("Telefone inválido.");
      return;
    }

    if (!nascimento) {
      alert("Informe sua data de nascimento.");
      return;
    }

    if (!senha || !confirmaSenha) {
      alert("Crie e confirme sua senha.");
      return;
    }

    if (senha !== confirmaSenha) {
      alert("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
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
      alert("Erro ao criar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>Olá, que bom te ter aqui!</h2>
      <p>Para sua segurança, faça um pequeno cadastro e gere uma senha.</p>

      {/* 🔐 JÁ SOU CLIENTE */}
      <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <strong>Já sou cliente</strong>

        <input
          type="tel"
          placeholder="Telefone com DDD"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <input
          type="password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <button
          onClick={validarClienteExistente}
          disabled={loading}
          style={{ marginTop: 12, width: "100%" }}
        >
          {loading ? "Validando..." : "Entrar"}
        </button>
      </div>

      <hr />

      {/* 🆕 NOVO CADASTRO */}
      <form onSubmit={cadastrarNovoCliente} style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <strong>Primeiro acesso</strong>

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
          {loading ? "Criando cadastro..." : "Continuar"}
        </button>
      </form>
    </div>
  );
};

export default ClientIdentifyPage;
