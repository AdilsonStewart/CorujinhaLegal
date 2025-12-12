import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Agendamento.css';
import { createClient } from '@supabase/supabase-js';

// 🔧 FIRESTORE
import { db } from "../firebase/config";
import { collection, addDoc } from "firebase/firestore";

// 🔧 SUPABASE
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

const Agendamento = () => {
  const navigate = useNavigate();

  // Estados
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);

  // Link da gravação salva na Supabase
  const [linkMensagem, setLinkMensagem] = useState('');
  useEffect(() => {
    const link = localStorage.getItem('lastRecordingUrl') || '';
    setLinkMensagem(link);
    console.log('🔗 Link da mensagem carregado:', link);
  }, []);

  // Ler o clienteId salvo no cadastro
  const clienteId = localStorage.getItem("clienteId");

  const horariosFixos = ["08:00", "10:00", "12:00", "16:00", "18:00"];

  const formatPhone = (v) => {
    const n = v.replace(/\D/g, '');
    return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const minDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const maxDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  // ⭐⭐ FUNÇÃO DE AGENDAMENTO ⭐⭐
  const handleSchedule = async () => {
    if (!nome || !telefone || !selectedDate || !selectedTime) {
      alert('Preencha todos os campos!');
      return;
    }

    if (!clienteId) {
      alert('Erro: Cliente não encontrado. Refaça o cadastro.');
      return;
    }

    const digits = telefone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      alert('Telefone inválido!');
      return;
    }

    const telefoneFull = `55${digits}`;

    setLoading(true);

    try {
      // Dados do agendamento
      const agendamento = {
        destinatario: nome.trim(),
        telefone: telefoneFull,
        data: selectedDate,
        hora: selectedTime,
        linkMensagem: linkMensagem,
        criadoEm: new Date().toISOString(),
        timestamp: Date.now(),
      };

      // ⭐⭐ 1. SALVAR NO LOCALSTORAGE (continua) ⭐⭐
      localStorage.setItem("agendamento_corujinha", JSON.stringify(agendamento));

      // ⭐⭐ 2. SALVAR NO SUPABASE (continua igual) ⭐⭐
      const dadosSupabase = {
        data_agendamento: selectedDate,
        hora_agendamento: selectedTime + ":00",
        link_midia: linkMensagem,
        criado_em: new Date().toISOString(),
        enviado: false,
        dados_completos: agendamento,
        valor: 5,
      };

      const { data: sData, error: sError } = await supabase
        .from("agendamentos")
        .insert([dadosSupabase])
        .select();

      if (sError) {
        console.error("❌ Erro Supabase:", sError);
      } else {
        console.log("✅ Supabase OK:", sData);
      }

      // ⭐⭐ 3. SALVAR NO FIRESTORE (NOVO, IMPORTANTE!) ⭐⭐
      console.log("🔥 Salvando no Firestore dentro do cliente:", clienteId);

      await addDoc(
        collection(db, "clientes", clienteId, "agendamentos"),
        agendamento
      );

      console.log("✅ Agendamento salvo no Firestore!");

      alert(`✔ Agendado com sucesso para ${selectedDate} às ${selectedTime}`);
      navigate("/saida");

    } catch (err) {
      console.error("❌ ERRO GERAL:", err);
      alert("Erro ao agendar.");
    }

    setLoading(false);
  };

  const handlePhoneChange = (e) => {
    setTelefone(formatPhone(e.target.value));
  };

  return (
    <div className="agendamento-container">
      <div className="agendamento-card">
        <h1 className="agendamento-titulo">🦉 Agendar Envio</h1>

        <div className="agendamento-form">

          {/* Nome */}
          <div className="form-group">
            <label>Nome do Destinatário *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          {/* Telefone */}
          <div className="form-group">
            <label>Telefone *</label>
            <input
              type="tel"
              value={telefone}
              onChange={handlePhoneChange}
            />
          </div>

          {/* Data */}
          <div className="form-group">
            <label>Data *</label>
            <input
              type="date"
              value={selectedDate}
              min={minDate()}
              max={maxDate()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Horário */}
          <div className="form-group">
            <label>Horário *</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            >
              <option value="">Selecione</option>
              {horariosFixos.map((h, i) => (
                <option key={i}>{h}</option>
              ))}
            </select>
          </div>

          <button onClick={handleSchedule} disabled={loading} className="btn-agendar">
            {loading ? "Agendando..." : "Confirmar Agendamento"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default Agendamento;
