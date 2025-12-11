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

  const seguroSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("⚠ localStorage bloqueado:", e);
    }
  };

  const handleCadastro = async () => {
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

    setLoading(true);
    setErro("");

    // Simulação de cadastro
    setTimeout(() => {
      // 🎯 AGORA SALVA DADOS COMPLETOS DO CLIENTE
      seguroSet("clienteId", "CLI_" + Date.now());
      seguroSet("clienteNome", nome);
      seguroSet("clienteTelefone", telefoneLimpo); // 🆕 Telefone limpo
      seguroSet("clienteEmail", email);
      seguroSet("clienteCPF", cpfCnpj);
      seguroSet("clienteDataNascimento", dataNascimento);

      console.log("✅ Cliente cadastrado:");
      console.log("- Nome:", nome);
      console.log("- Telefone:", telefoneLimpo);
      console.log("- Email:", email);

      setLoading(false);
      navigate("/servicos");
    }, 1000);
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
          />

          <input
            type="tel"
            placeholder="Telefone com DDD * (ex: 11999998888)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
          />
          <small className="dica-telefone">Somente números, com DDD</small>

          <input
            type="text"
            placeholder="Data de nascimento *"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
          />

          <input
            type="text"
            placeholder="CPF ou CNPJ *"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
          />

          <input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cadastro-input"
            autoComplete="off"
          />

          <button
            className="cadastro-botao"
            onClick={handleCadastro}
            disabled={loading}
          >
            {loading ? "Salvando…" : "Cadastrar e Continuar"}
          </button>

          {erro && <p className="cadastro-erro">{erro}</p>}
        </div>
      </div>
    </div>
  );
}
