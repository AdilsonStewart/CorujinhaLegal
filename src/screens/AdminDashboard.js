import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase-client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAudios = async () => {
    try {
      const q = query(collection(db, 'audios'), orderBy('dataCriacao', 'desc'));
      const querySnapshot = await getDocs(q);

      const audiosList = [];
      querySnapshot.forEach((doc) => {
        audiosList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setAudios(audiosList);
    } catch (error) {
      console.error('Erro Firebase:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudios();
  }, []);

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Carregando Firebase...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🎛️ Painel Admin</h1>
        <button className="btn-voltar" onClick={() => navigate('/')}>
          ← Voltar
        </button>
      </div>

      <div className="audios-list">
        {audios.map((audio) => (
          <div key={audio.id} className="audio-item">
            <button onClick={() => window.open(audio.arquivoUrl, '_blank')}>
              ▶️ Ouvir
            </button>
            <button onClick={() => copyToClipboard(audio.arquivoUrl)}>
              📋 Copiar Link
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
