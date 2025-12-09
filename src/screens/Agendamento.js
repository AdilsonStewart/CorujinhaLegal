import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase-client'; // Firestore

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
      setLinkMensagem(localStorage.getItem('lastRecordingUrl') || '');
    }
  }, []);

  const horariosFixos = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

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

  // Função de agendamento
  const handleSchedule = async () => {
    if (!nome || !telefone || !selectedDate || !selectedTime) {
      alert('Preencha todos os campos!');
      return;
    }

    const digits = telefone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      alert('Telefone inválido!');
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
      // 1) Salva no Firestore
      await addDoc(collection(db, 'agendamentos'), {
        nome: nome.trim(),
        telefone: telefoneFull,
        data: selectedDate,
        hora: selectedTime,
        linkMidia: linkMensagem,
        enviado: false,
        criadoEm: serverTimestamp()
      });

      // Salva no localStorage pra tela de saída
      localStorage.setItem('lastAgendamento', JSON.stringify({
        nome: nome.trim(),
        dataEntrega: selectedDate,
        horario: selectedTime
      }));

      // 2) Envia para o servidor Fly.io
      try {
        await fetch('https://deixacomigo-sender.fly.dev/agendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome.trim(),
            telefone: telefoneFull,
            data: selectedDate,
            hora: selectedTime,
            linkMidia: linkMensagem
          })
        });
        console.log('📡 Agendamento enviado ao servidor com sucesso');
      } catch (serverError) {
        console.error('❌ Erro ao enviar para o servidor:', serverError);
      }

      // Resto do fluxo (limpar campos, navegar, etc.)
      setLoading(false);
      navigate('/confirmacao'); // ou a rota que houver
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert('Erro ao salvar agendamento. Tente novamente.');
      setLoading(false);
    }
  };

  // ... o restante do componente (render JSX) permanece exatamente como antes ...
  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h2>Gravador de Agendamento</h2>

      {/* Formulário (mantém os inputs e botões que já existiam) */}
      {/* ... */}
      <button onClick={handleSchedule} disabled={loading}>
        {loading ? 'Aguarde...' : 'Agendar'}
      </button>
    </div>
  );
};

export default Agendamento;
