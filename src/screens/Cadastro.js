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
      nome: nome.trim(),
      telefone: telefoneLimpo,
      email: email.trim().toLowerCase(),
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      dataNascimento: dataNascimento,
      criadoEm: new Date().toISOString(),
      timestamp: Date.now()
    };

    try {
      console.log("1. Salvando no localStorage...");
      localStorage.setItem('clienteCorujinha', JSON.stringify(clienteData));
      localStorage.setItem('clienteTelefone', telefoneLimpo);
      console.log("✅ localStorage salvo");

      console.log("2. Tentando Firebase...");
      
      // FIREBASE DIRETO - VERSÃO SIMPLES
      // Carrega o Firebase do CDN (funciona em qualquer lugar)
      const firebaseScript = document.createElement('script');
      firebaseScript.src = 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
      document.head.appendChild(firebaseScript);
      
      const firestoreScript = document.createElement('script');
      firestoreScript.src = 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
      document.head.appendChild(firestoreScript);
      
      // Espera os scripts carregarem
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Configuração do Firebase (MESMAS CHAVES)
      const firebaseConfig = {
        apiKey: "AIzaSyASmPjNdBFly7ndXk0n-FFbWT-2DQLlevI",
        authDomain: "corujinhalegal2-5c7c9.firebaseapp.com",
        projectId: "corujinhalegal2-5c7c9",
        storageBucket: "corujinhalegal2-5c7c9.firebasestorage.app",
        messagingSenderId: "711736746096",
        appId: "1:711736746096:web:dd3a64784367133dd414b5"
      };
      
      // Inicializa o Firebase
      const app = window.firebase.initializeApp(firebaseConfig);
      const db = window.firebase.firestore();
      
      console.log("3. Salvando no Firestore...");
      
      // Salva no Firebase
      const docRef = await db.collection("Clientes").add(clienteData);
      
      console.log("✅ FIREBASE SUCESSO! ID:", docRef.id);
      
      // Adiciona o ID ao localStorage
      clienteData.idFirebase = docRef.id;
      localStorage.setItem('clienteCorujinha', JSON.stringify(clienteData));
      
      setLoading(false);
      setErro("✅ Cadastro realizado com sucesso!");
      
      setTimeout(() => {
        navigate("/servicos");
      }, 1500);
      
    } catch (error) {
      console.error("❌ ERRO no Firebase:", error.message || error);
      
      // Mesmo com erro, redireciona
      setErro("✅ Cadastro salvo localmente! Redirecionando...");
      setLoading(false);
      
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
            {loading ? "Salvando..." : "Cadastrar e Continuar"}
          </button>

          {erro && (
            <p className={erro.includes("✅") ? "cadastro-sucesso" : "cadastro-erro"}>
              {erro}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
