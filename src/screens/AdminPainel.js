import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase-client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import './PainelAdmin.css';

const PainelAdmin = () => {
  const navigate = useNavigate();
  const [audios, setAudios] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);

  console.log('🔧 PainelAdmin iniciando...');
  console.log('🔧 Firebase db:', db);

  // Buscar todos os áudios do Firebase
  const fetchAudios = async () => {
    try {
      console.log('📤 Buscando áudios do Firebase...');
      const q = query(collection(db, 'audios'), orderBy('dataCriacao', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log('✅ QuerySnapshot:', querySnapshot);
      
      const audiosList = [];
      querySnapshot.forEach((doc) => {
        console.log('📄 Documento:', doc.id, doc.data());
        audiosList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('🎧 Áudios encontrados:', audiosList);
      setAudios(audiosList);
    } catch (error) {
      console.error('❌ Erro ao buscar áudios:', error);
      setFirebaseError(error.message);
    }
  };

  // Buscar agendamentos do localStorage
  const fetchAgendamentos = () => {
    try {
      const lastAgendamento = localStorage.getItem('lastAgendamento');
      const agendamentosList = lastAgendamento ? [JSON.parse(lastAgendamento)] : [];
      setAgendamentos(agendamentosList);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect executando...');
    const loadData = async () => {
      await fetchAudios();
      fetchAgendamentos();
      setLoading(false);
    };
    loadData();
  }, []);

  // ... resto das funções permanecem iguais

  if (loading) {
    return (
      <div className="painel-admin-container">
        <div className="loading">Carregando dados do Firebase...</div>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="painel-admin-container">
        <div className="error-state">
          <h2>❌ Erro no Firebase</h2>
          <p>{firebaseError}</p>
          <button className="btn-voltar" onClick={() => navigate('/')}>
            ← Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  // ... resto do JSX permanece igual ao que você já tem
