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
  const [loginTelefone, setLoginTelefone] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const [cadNome, setCadNome] = useState("");
  const [cadTelefone, setCadTelefone] = useState("");
  const [cadNascimento, setCadNascimento] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [cadConfirmaSenha, setCadConfirmaSenha] = useState("");

  const [loading, setLoading] = useState(false);

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

      localStorage.setItem("clienteTelefone", telClean);
      localStorage.setItem("clienteNome", cliente.nome || "");
      window.location.href = "/minhas-mensagens";

    } catch {
      alert("Erro ao validar acesso.");
    } finally {
      setLoading(false);
    }
  };

  const cadastrarNovoCliente = async (e) => {
    e.preventDefault();

    const telClean = sanitizePhone(cadTelefone);

    if (!cadNome || !telClean || !cadNascimento || !cadSenha) {
      alert("Preencha todos os campos.");
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

    } catch {
      alert("Erro ao criar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0B0F1A",
      padding: 20
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* GIF */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <img
            src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGp4emIxbG56aTN6d3Z2NXJobG81cHZubm51dDFpNDNmbTY4c3k0YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/koQc8mBoKI1zRmQFvF/giphy.gif"
            alt="Bem-vindo"
            style={{ width: 60 }}
          />
        </div>

        <h2 style={{ textAlign: "center", color: "#1E90FF" }}>
          Olá, que bom te ter aqui!
        </h2>

        <p style={{
          textAlign: "center",
          color: "#B0BEC5",
          marginBottom: 30
        }}>
          Para sua segurança, acesse com sua senha ou faça um pequeno cadastro.
        </p>

        {/* 🔐 JÁ SOU CLIENTE */}
        <div style={cardWhite}>
          <strong style={{ color: "#1E90FF" }}>Já sou cliente</strong>

          <input
            type="tel"
            placeholder="Telefone com DDD"
            value={loginTelefone}
            onChange={(e) => setLoginTelefone(e.target.value)}
            style={inputLight}
          />

          <input
            type="password"
            placeholder="Senha"
            value={loginSenha}
            onChange={(e) => setLoginSenha(e.target.value)}
            style={inputLight}
          />

          <button onClick={entrarCliente} disabled={loading} style={btnPrimary}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <hr style={{ borderColor: "#1F2937", margin: "30px 0" }} />

        {/* 🆕 PRIMEIRO ACESSO */}
        <form onSubmit={cadastrarNovoCliente} style={cardWhite}>
          <strong style={{ color: "#2ECC71" }}>Primeiro acesso</strong>

          <input type="text" placeholder="Nome completo"
            value={cadNome} onChange={(e) => setCadNome(e.target.value)}
            style={inputLight} />

          <input type="tel" placeholder="Telefone com DDD"
            value={cadTelefone} onChange={(e) => setCadTelefone(e.target.value)}
            style={inputLight} />

          <input type="date"
            value={cadNascimento} onChange={(e) => setCadNascimento(e.target.value)}
            style={inputLight} />

          <input type="password" placeholder="Crie uma senha"
            value={cadSenha} onChange={(e) => setCadSenha(e.target.value)}
            style={inputLight} />

          <input type="password" placeholder="Confirme sua senha"
            value={cadConfirmaSenha} onChange={(e) => setCadConfirmaSenha(e.target.value)}
            style={inputLight} />

          <button type="submit" disabled={loading} style={btnSuccess}>
            {loading ? "Criando cadastro..." : "Continuar"}
          </button>
        </form>

      </div>
    </div>
  );
};

const cardWhite = {
  background: "#FFFFFF",
  padding: 20,
  borderRadius: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  display: "grid",
  gap: 12
};

const inputLight = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#000000"
};

const btnPrimary = {
  marginTop: 10,
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#1E90FF",
  color: "#FFFFFF",
  fontWeight: "bold",
  cursor: "pointer"
};

const btnSuccess = {
  ...btnPrimary,
  background: "#2ECC71"
};

export default ClientIdentifyPage;
