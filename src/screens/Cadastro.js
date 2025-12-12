import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "/src/firebaseConfig"; // Importa o Firebase
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
    // Validar campos obrigatórios
    if (!nome || !telefone || !dataNascimento || !cpfCnpj || !email) {
      setErro("Preencha todos os campos!");
      return;
    }

    // Validar telefone
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      setErro("Digite um telefone válido com DDD (ex: 11999998888)");
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErro("Digite um email válido!");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      console.log("📤 Salvando cliente no Firebase...");
      
      // 🎯 SALVAR NO FIREBASE FIRESTORE
      const docRef = await addDoc(collection(db, "Clientes"), {
        nome: nome.trim(),
        telefone: telefoneLimpo,
        email: email.trim().toLowerCase(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''), // Remove pontos/traços
        dataNascimento: dataNascimento,
        criadoEm: new Date().toISOString(),
        tipo: "cliente"
      });

      console.log("✅ Cliente salvo no Firebase! ID:", docRef.id);

      // 🎯 SALVAR NO localStorage PARA USO IMEDIATO
      const clienteData = {
        id: docRef.id,
        nome: nome.trim(),
        telefone: telefoneLimpo,
        email: email.trim().toLowerCase(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        dataNascimento: dataNascimento
      };
      
      localStorage.setItem('clienteCorujinha', JSON.stringify(clienteData));
      localStorage.setItem('clienteTelefone', telefoneLimpo);
      localStorage.setItem('clienteId', docRef.id);

      console.log("✅ Cliente salvo no localStorage:", clienteData);

      setLoading(false);
      
      // Redirecionar para serviços
      navigate("/servicos");

    } catch (error) {
      console.error("❌ Erro ao salvar no Firebase:", error);
      setErro("Erro ao cadastrar. Tente novamente.");
      setLoading(false);
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
