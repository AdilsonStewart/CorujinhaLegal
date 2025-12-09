import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase-client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log('✅ AdminDashboard carregando...');

  // Buscar áudios do Firebase
  const fetchAudios = async () => {
    try {
      console.log('🔍 Buscando áudios...');
      const q = query(collection(db, 'audios'), orderBy('dataCriacao', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const audiosList = [];
      querySnapshot.forEach((doc) => {
        audiosList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setAudios(audiosList);
      console.log('🎧 Áudios carregados:', audiosList.length);
    } catch (error) {
      console.error('❌ Erro Firebase:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudios();
  }, []);

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url)
      .then(() => alert('✅ Link copiado!'))
      .catch(err => console.error('Erro ao copiar:', err));
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
        <p>Links das mensagens do Firebase</p>
        <button className="btn-voltar" onClick={() => navigate('/')}>
          ← Voltar
        </button>
      </div>

      <div className="audios-list">
        <h2>🔗 Mensagens ({audios.length})</h2>
        
        {audios.length === 0 ? (
          <p>Nenhuma mensagem no Firebase</p>
        ) : (
          audios.map((audio) => (
            <div key={audio.id} className="audio-item">
              <p><strong>Data:</strong> {new Date(audio.dataCriacao).toLocaleString('pt-BR')}</p>
              <p><strong>Duração:</strong> {audio.duracao}s</p>
              <div className="audio-actions">
                <button onClick={() => window.open(audio.arquivoUrl, '_blank')}>
                  ▶️ Ouvir
                </button>
                <button onClick={() => copyToClipboard(audio.arquivoUrl)}>
                  📋 Copiar Link
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
