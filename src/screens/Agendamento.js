import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Agendamento.css';

const Agendamento = () => {
  const navigate = useNavigate();

  // Estados
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Lê o link da gravação de forma segura no cliente
  const [linkMensagem, setLinkMensagem] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const link = localStorage.getItem('lastRecordingUrl') || '';
      setLinkMensagem(link);
      console.log('🔗 Link da mensagem carregado:', link);
    }
  }, []);

  // SEUS HORÁRIOS ESPECÍFICOS
  const horariosFixos = ["08:00", "10:00", "12:00", "16:00", "18:00"];

  // Formata telefone
  const formatPhone = (v) => {
    const n = v.replace(/\D/g, '');
    if (n.length <= 11) {
      return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return v;
  };

  // Data mínima (2 dias à frente)
  const minDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  // Data máxima (1 ano)
  const maxDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  // Função de agendamento - ATUALIZADA PARA SEU FLUXO
  const handleSchedule = async () => {
    if (!nome || !telefone || !selectedDate || !selectedTime) {
      alert('Preencha todos os campos!');
      return;
    }

    const digits = telefone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      alert('Telefone inválido! Use DDD + número (10 ou 11 dígitos)');
      return;
    }

    const telefoneFull = `55${digits}`;

    const hoje = new Date();
    const dataEscolhida = new Date(selectedDate);
    const minimo24h = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
    
    if (dataEscolhida < minimo24h) {
      alert('Precisa ser com no mínimo 24h de antecedência!');
      return;
    }

    setLoading(true);

    try {
      // 1) Salva no localStorage para o Retorno.js processar
      const agendamentoDados = {
        nome: nome.trim(),
        telefone: telefoneFull,
        data: selectedDate,
        hora: selectedTime,
        linkMensagem: linkMensagem,
        timestamp: new Date().toISOString()
      };

      // SALVA DUAS VEZES PARA GARANTIR
      localStorage.setItem('agendamento_corujinha', JSON.stringify(agendamentoDados));
      localStorage.setItem('lastAgendamento', JSON.stringify({
        nome: nome.trim(),
        telefone: telefoneFull,
        dataEntrega: selectedDate,
        horario: selectedTime,
        linkMensagem: linkMensagem
      }));

      console.log('📝 Agendamento salvo no localStorage:', agendamentoDados);

      // 2) Aqui o sistema vai enviar para o webhook
      // (O Retorno.js vai lidar com isso após o pagamento)
      
      // 3) Mensagem de sucesso
      alert(`✅ Agendado com sucesso!\nPara: ${nome.trim()}\nData: ${selectedDate}\nHorário: ${selectedTime}`);

      // 4) Redireciona para página de saída
      setTimeout(() => {
        navigate('/saida');
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert('Erro ao salvar agendamento. Tente novamente.');
      setLoading(false);
    }
  };

  // Formata telefone enquanto digita
  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setTelefone(formatted);
  };

  return (
    <div className="agendamento-container">
      <div className="agendamento-card">
        <h1 className="agendamento-titulo">
          <span className="coruja-icon">🦉</span> Agendar Envio
        </h1>
        
        <p className="agendamento-descricao">
          Informe os dados do destinatário e quando devemos enviar sua mensagem.
        </p>

        <div className="agendamento-form">
          
          {/* Nome do Destinatário */}
          <div className="form-group">
            <label htmlFor="nome">
              <span className="required">*</span> Nome do Destinatário
            </label>
            <input
              type="text"
              id="nome"
              placeholder="Ex: Maria, João, Família Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength="3"
              maxLength="100"
              className="form-input"
            />
            <small className="form-help">
              Para quem é a mensagem?
            </small>
          </div>

          {/* Telefone */}
          <div className="form-group">
            <label htmlFor="telefone">
              <span className="required">*</span> Telefone do Destinatário
            </label>
            <input
              type="tel"
              id="telefone"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={handlePhoneChange}
              required
              className="form-input"
            />
            <small className="form-help">
              Para enviarmos o SMS com o link da mensagem
            </small>
          </div>

          {/* Data */}
          <div className="form-group">
            <label htmlFor="selectedDate">
              <span className="required">*</span> Data de Envio
            </label>
            <input
              type="date"
              id="selectedDate"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate()}
              max={maxDate()}
              required
              className="form-input"
            />
            <small className="form-help">
              Mínimo 2 dias de antecedência
            </small>
          </div>

          {/* Hora - APENAS SEUS HORÁRIOS */}
          <div className="form-group">
            <label htmlFor="selectedTime">
              <span className="required">*</span> Horário de Envio
            </label>
            <select
              id="selectedTime"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              className="form-select"
            >
              <option value="">Selecione um horário</option>
              {horariosFixos.map((horario, index) => (
                <option key={index} value={horario}>
                  {horario}
                </option>
              ))}
            </select>
            <small className="form-help">
              Horários disponíveis: 8h, 10h, 12h, 16h, 18h
            </small>
          </div>

          {/* Link da mensagem (somente leitura) */}
          {linkMensagem && (
            <div className="form-group">
              <label>Sua mensagem:</label>
              <div className="link-mensagem">
                <span className="link-icon">🔗</span>
                <span className="link-text">Mensagem gravada e pronta para envio</span>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="form-botoes">
            <button
              type="button"
              onClick={handleSchedule}
              disabled={loading}
              className="btn-agendar"
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Agendando...
                </>
              ) : (
                '✅ Confirmar Agendamento'
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/servicos')}
              className="btn-voltar"
            >
              ↩ Voltar
            </button>
          </div>

        </div>

        {/* Informações importantes */}
        <div className="agendamento-info">
          <h3>ℹ️ Como funciona:</h3>
          <ul>
            <li>No dia e hora agendados, enviaremos um SMS para {nome || "o destinatário"}</li>
            <li>O SMS conterá um link para ouvir/ver a mensagem</li>
            <li>Mínimo 2 dias de antecedência para agendar</li>
            <li>Horários disponíveis: 8h, 10h, 12h, 16h, 18h</li>
            <li>O sistema buscará automaticamente nos horários programados</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default Agendamento;
