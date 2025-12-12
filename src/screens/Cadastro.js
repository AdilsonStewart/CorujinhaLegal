import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { collection, addDoc } from "firebase/firestore";
import "./Cadastro.css";

export default function Cadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleCadastro = async () => {
    console.log("1️⃣ handleCadastro iniciado");
    
    if (!nome || !telefone || !dataNascimento || !cpfCnpj || !email) {
      setErro("Preencha todos os campos!");
      return;
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      setErro("Digite um telefone válido com DDD (ex: 11999998888)");
      return;
    }

    setLoading(true);
    setErro("");
    
    console.log("2️⃣ Validações passadas, loading=true");

    try {
      console.log("📤 3️⃣ Entrou no try-catch");
      console.log("📤 db existe?", !!db);
      console.log("📤 Tipo de db:", typeof db);
      
      // Teste SIMPLES primeiro
      console.log("4️⃣ Criando dados de teste...");
      const dadosTeste = {
        mensagem: "Teste Firebase " + Date.now(),
        timestamp: new Date().toISOString(),
        teste: true
      };
      
      console.log("5️⃣ Tentando salvar TESTE...");
      console.log("📤 Dados teste:", dadosTeste);
      
      // Tenta salvar um documento de TESTE em coleção separada
      const testeRef = await addDoc(collection(db, "TesteDebug"), dadosTeste);
      
      console.log("✅ 6️⃣ TESTE OK! Documento salvo com ID:", testeRef.id);
      
      // Se passar, tenta salvar o cliente real
      console.log("7️⃣ Agora salvando cliente real...");
      const dadosCliente = {
        nome: nome.trim(),
        telefone: telefoneLimpo,
        email: email.trim().toLowerCase(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        dataNascimento: dataNascimento,
        criadoEm: new Date().toISOString(),
        tipo: "cliente"
      };
      
      console.log("📤 Dados cliente:", dadosCliente);
      
      const clienteRef = await addDoc(collection(db, "Clientes"), dadosCliente);

      console.log("✅ 8️⃣ CLIENTE SALVO! ID:", clienteRef.id);

      // Salvar no localStorage também (para compatibilidade)
      const clienteData = {
        id: clienteRef.id,
        nome: nome.trim(),
        telefone: telefoneLimpo,
        email: email.trim().toLowerCase(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        dataNascimento: dataNascimento
      };
      
      localStorage.setItem('clienteCorujinha', JSON.stringify(clienteData));
      localStorage.setItem('clienteTelefone', telefoneLimpo);

      console.log("✅ 9️⃣ localStorage atualizado");

      setLoading(false);
      console.log("🔟 Redirecionando para /servicos...");
      
      navigate("/servicos");

    } catch (error) {
      console.error("❌ ERRO COMPLETO no Firebase:");
      console.error("❌ Nome do erro:", error.name);
      console.error("❌ Mensagem:", error.message);
      console.error("❌ Código:", error.code);
      console.error("❌ Stack:", error.stack);
      
      // Fallback: salvar apenas no localStorage
      console.log("🔄 Fallback: salvando apenas no localStorage");
      const clienteData = {
        id: "CLI_" + Date.now(),
        nome: nome.trim(),
        telefone: telefoneLimpo,
        email: email.trim().toLowerCase(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        dataNascimento: dataNascimento
      };
      
      localStorage.setItem('clienteCorujinha', JSON.stringify(clienteData));
      localStorage.setItem('clienteTelefone', telefoneLimpo);
      
      setErro(`Cadastro realizado! (Firebase offline)`);
      setLoading(false);
      
      // Redireciona mesmo com erro no Firebase
      setTimeout(() => {
        navigate("/servicos");
      }, 1500);
    }
  };

  return (
    <div className="cadastro-page">
      <div className="cadastro-card">
        <h1 className="cadastro-titulo">Cadastro</h1>
        <div className="cadastro-form">
          <input
            type="text"
            placeholder="Nome completo *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
            disabled={loading}
          />

          <input
            type="tel"
            placeholder="Telefone com DDD * (ex: 11999998888)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
            disabled={loading}
          />
          <small className="dica-telefone">Somente números, com DDD</small>

          <input
            type="date"
            placeholder="Data de nascimento *"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
            disabled={loading}
          />

          <input
            type="text"
            placeholder="CPF ou CNPJ *"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
            disabled={loading}
          />

          <input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
            disabled={loading}
          />

          <button
            className="cadastro-botao"
            onClick={handleCadastro}
            disabled={loading}
          >
            {loading ? "Salvando no Firebase…" : "Cadastrar e Continuar"}
          </button>

          {erro && <p className="cadastro-erro">{erro}</p>}
        </div>
      </div>
    </div>
  );
}
