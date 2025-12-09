import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Erro.css';

export default function Erro() {
  const navigate = useNavigate();

  return (
    <div className="container erro-container">
      <div className="erro-card">
        <div className="erro-icon">❌</div>
        <h1 className="erro-titulo">Pagamento com Problema</h1>
        <p className="erro-mensagem">
          Ocorreu um problema com seu pagamento.
        </p>
        <p className="erro-detalhes">
          Tente novamente ou entre em contato conosco.
        </p>
        
        <button 
          className="botao botao-tentar-novamente"
          onClick={() => navigate('/servicos')}
        >
          🔄 Tentar Novamente
        </button>
        
        <button 
          className="botao-voltar"
          onClick={() => navigate('/')}
        >
          Voltar para Início
        </button>
      </div>
    </div>
  );
}
