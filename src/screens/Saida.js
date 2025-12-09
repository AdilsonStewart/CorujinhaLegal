import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Saida.css';

const Saida = () => {
  const navigate = useNavigate();
  
  // Puxa os dados com os nomes corretos que o Agendamento.js salva
  const dados = JSON.parse(localStorage.getItem('lastAgendamento') || '{}');

  const formatDate = (iso) => {
    if (!iso) return 'A ser definida';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="saida-container">
      <div className="saida-content">
        <div className="gif-container">
          <img
            src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTNoNnJiOHFwOHczb3VvbDg1bngxN3F3eG93dG01YXplbWoyMDJodiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Y258CvWqb5qyfp5JA9/giphy.gif"
            alt="Sucesso"
            className="success-gif"
          />
        </div>

        <h1 className="saida-title">Agendamento Confirmado!</h1>

        <div className="saida-info">
          <h3>Resumo do Agendamento:</h3>
          <div className="info-item"><strong>Status:</strong> <span className="status-confirmado">Confirmado</span></div>
          <div className="info-item"><strong>Nome do destinatário:</strong> {dados.nome || 'Não informado'}</div>
          <div className="info-item"><strong>Data da entrega:</strong> {formatDate(dados.dataEntrega)}</div>
          <div className="info-item"><strong>Horário preferencial:</strong> {dados.horario || 'Não informado'}</div>
          <div className="info-item"><strong>Entrega:</strong> Link Via SMS</div>
        </div>

        <div className="saida-buttons">
          <button className="btn-nova-mensagem" onClick={() => navigate('/servicos')}>
            Enviar Nova Mensagem
          </button>
          <button className="btn-sair" onClick={() => { localStorage.clear(); navigate('/'); }}>
            Sair do App
          </button>
        </div>

        <div className="saida-footer">
          <p>Obrigado por usar nosso serviço! A corujinha agradece!</p>
        </div>
      </div>
    </div>
  );
};

export default Saida;
