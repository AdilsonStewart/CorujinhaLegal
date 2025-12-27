import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const ADMIN_PASSWORD = "123456";

  const handleAdminAccess = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      navigate("/admin");
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 3000);
    }
  };

  return (
    <div className="container">

      {/* Cabeçalho */}
      <div className="cabecalho-home">
        <div className="logo">OwlBuddy</div>
        <p className="subtitulo">A sua Corujinha Legal chegou!</p>
      </div>

      {/* Mascote */}
      <div className="mascote-container">
        <img
          src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTg0cXptZ2t1a3QxNTczY25xbzJ5bDA2MXFuMnRocWNzdXZvMHB0aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XpfXuBYtvR9I8jjBH0/giphy.gif"
          alt="Mascote OwlBuddy"
          className="mascote-image"
        />
      </div>

      <h1 className="titulo">Nunca mais esqueça um momento importante</h1>
      <p className="slogan">
        Grave agora e deixe que a Corujinha entregue no momento certo 🦉
      </p>

      <button className="botao-principal" onClick={() => navigate("/sou-cliente")}>
        Criar meu lembrete
      </button>

      <p className="texto-secundario">
        Sua voz. Seu tempo. Do seu jeito.
      </p>

      {/* Área Admin */}
      <div className="admin-area">
        <button className="admin-toggle" onClick={() => setShowAdmin(!showAdmin)}>
          ⚙ Área administrativa
        </button>

        {showAdmin && (
          <div className="admin-box">
            <input
              type="password"
              placeholder="Senha de administrador"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />

            <button className="admin-btn" onClick={handleAdminAccess}>
              Entrar
            </button>

            {passwordError && (
              <p className="erro">Senha incorreta</p>
            )}
          </div>
        )}
      </div>

      <footer className="rodape">
        © {new Date().getFullYear()} OwlBuddy — feito com carinho 💛
      </footer>
    </div>
  );
}
