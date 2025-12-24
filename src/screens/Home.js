import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Senha do admin - 123456
  const ADMIN_PASSWORD = "123456";

  const handleAdminAccess = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      navigate('/admin');
    } else {
      setPasswordError(true);
      setAdminPassword('');
      setTimeout(() => setPasswordError(false), 3000);
    }
  };

  const toggleAdmin = () => {
    setShowAdmin(!showAdmin);
    setAdminPassword('');
    setPasswordError(false);
  };

  return (
    <div className="container">
      {/* LOGO OWLBUDDY NO TOPO - NOVO! */}
      <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '20px' }}>
        <img
          src="https://lh3.googleusercontent.com/pw/AP1GczN8z3zV6o3bL9kQeXhV0pR7sT2uV4wY6z8A0B2C4D6E8F0G2H4I6J8K0L2M=w800-h600"  // Link direto do seu logo (ajustado pra tamanho bom)
          alt="Logo OwlBuddy"
          style={{ maxWidth: '80%', height: 'auto', borderRadius: '10px' }}  // Responsivo e bonito
        />
      </div>

      <p className="nao-esqueca">Não Esqueça Mais:</p>
      <div className="mascote-container">
        <img
          src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTg0cXptZ2t1a3QxNTczY25xbzJ5bDA2MXFuMnRocWNzdXZvMHB0aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XpfXuBYtvR9I8jjBH0/giphy.gif"
          alt="Mascote DeixaComigo"
          className="mascote-image"
        />
      </div>
      <h2 className="corujinha-legal">Corujinha Legal</h2>
     
      <h1 className="titulo">DeixaComigo</h1>
      <p className="slogan">Lembrou agora?<br />Programe o parabéns!</p>

      {/* Botão principal */}
      <button
        className="botao criar-lembrete"
        onClick={() => navigate('/sou-cliente')}
      >
        Criar Meu Lembrete
      </button>

      <p className="texto-pequeno">
        Sua voz, na hora certa.<br />Todo mundo acha que você nunca esquece.
      </p>

      {/* ADMIN CENTRALIZADO */}
      <div className="admin-centralizado">
        <button
          className="admin-btn-central"
          onClick={toggleAdmin}
        >
          {showAdmin ? '✖ Fechar Admin' : '⚙ Acesso Admin'}
        </button>
        {showAdmin && (
          <div className="admin-painel-central">
            <h3>Área Administrativa</h3>
            <input
              type="password"
              placeholder="Digite a senha admin"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="admin-input-central"
              onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
            />
            <button
              className="admin-btn-acessar"
              onClick={handleAdminAccess}
            >
              🔓 Acessar Painel
            </button>
            {passwordError && (
              <p className="admin-erro-central">Senha incorreta - Digite: 123456</p>
            )}
            <p className="admin-dica">Senha: 123456</p>
          </div>
        )}
      </div>
    </div>
  );
}
