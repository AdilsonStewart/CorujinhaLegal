import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    console.log("🚀 handleCadastro INICIADO");
    
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

    // Dados do cliente
    const clienteData = {
      id: "CLI_" + Date.now(),
      nome: nome.trim(),
      telefone: telefoneLimpo,
      email: email.trim().toLowerCase(),
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      dataNascimento: dataNascimento,
      criadoEm: new Date().toISOString()
    };

    try {
      console.log("1. Salvando no localStorage...");
      localStorage.setItem('clienteCorujinha', JSON.stringify(clienteData));
      localStorage.setItem('clienteTelefone', telefoneLimpo);
      console.log("✅ localStorage salvo");

      console.log("2. Tentando Firebase...");
      
      // USANDO AS IMPORTAÇÕES QUE JÁ EXISTEM
      const { db } = await import("../firebase/config.js");
      const { collection, addDoc } = await import("firebase/firestore");
      
      console.log("3. Salvando no Firestore...");
      const docRef = await addDoc(collection(db, "Clientes"), clienteData);
      
      console.log("✅ FIREBASE SUCESSO! ID:", docRef.id);
      
      // Atualiza localStorage com ID real
      clienteData.id = docRef.id;
      localStorage.setItem('clienteCorujinha', JSON.stringify(clienteData));
      
      setLoading(false);
      navigate("/servicos");
      
    } catch (error) {
      console.error("❌ ERRO no Firebase:", error);
      console.error("Detalhes do erro:", error.message);
      
      // Mostra erro mais detalhado
      setErro("Cadastro salvo localmente! Erro Firebase: " + error.message);
      setLoading(false);
      
      // Mesmo com erro, redireciona depois de 2 segundos
      setTimeout(() => {
        navigate("/servicos");
      }, 2000);
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
            {loading ? "Salvando..." : "Cadastrar e Continuar"}
          </button>

          {erro && <p className="cadastro-erro">{erro}</p>}
        </div>
      </div>
    </div>
  );
}
