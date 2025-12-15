import React, { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
console.log("🔥 AUDIO RECORD PAGE — BUILD NOVO 🔥", Date.now());

// 🔧 CONFIGURAÇÃO DO SUPABASE (mantive como estava)
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------
// Firestore (opcional)
// ---------------------------
// O código abaixo inicializa a Firebase/Firestore usando variáveis de ambiente.
// Se você não quer usar Firestore, basta não definir as variáveis e o código
// continuará funcionando apenas com Supabase.
//
// Variáveis esperadas (ex.: em .env):
// REACT_APP_FIREBASE_API_KEY
// REACT_APP_FIREBASE_AUTH_DOMAIN
// REACT_APP_FIREBASE_PROJECT_ID
// REACT_APP_FIREBASE_STORAGE_BUCKET
// REACT_APP_FIREBASE_MESSAGING_SENDER_ID
// REACT_APP_FIREBASE_APP_ID
//
// Se for usar, rode: npm install firebase@9
let firebaseInitialized = false;
let firestoreInstance = null;

async function initFirestoreIfNeeded() {
  if (firebaseInitialized) return firestoreInstance;

  // Detecta presença mínima das configs (só checamos API key e project id)
  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    // Firestore não configurado — não inicializa
    console.warn("Firestore não inicializado: variáveis REACT_APP_FIREBASE_* ausentes.");
    return null;
  }

  try {
    // Import dinâmico para não forçar a dependência quando não usada
    const firebase = await import('firebase/app');
    // v9 modular imports:
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');

    // Evita reinicializar caso já haja app
    const apps = getApps();
    if (apps.length === 0) {
      initializeApp({
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
      });
    }

    firestoreInstance = getFirestore();
    firebaseInitialized = true;
    console.info("Firestore inicializado com sucesso.");
    return firestoreInstance;
  } catch (err) {
    console.warn("Falha ao inicializar Firestore (verifique se 'firebase' está instalado):", err.message || err);
    return null;
  }
}

async function salvarNaFirestore(dados) {
  // dados esperado: objeto com campos já preparados
  const db = await initFirestoreIfNeeded();
  if (!db) return null;

  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const colRef = collection(db, "agendamentos"); // mesma coleção que usamos no Supabase (nome escolhido)
    const docRef = await addDoc(colRef, {
      ...dados,
      criado_em_firestore: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
    console.info("Documento salvo na Firestore:", docRef.id);
    return docRef.id;
  } catch (err) {
    console.warn("Erro ao salvar na Firestore:", err.message || err);
    return null;
  }
}

// ---------------------------
// Componente principal
// ---------------------------
const AudioRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setAudioURL(null);
      setAudioBlob(null);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        clearInterval(tempoIntervalRef.current);
        setTempoRestante(30);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      tempoIntervalRef.current = setInterval(() => {
        setTempoRestante(prev => {
          if (prev <= 1) {
            stopRecording();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      alert("Não consegui acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(tempoIntervalRef.current);
      setTempoRestante(30);
    }
  };

  // 🔹 FUNÇÃO PARA ENVIAR TODOS OS DADOS PARA SUPABASE E FIRESTORE (opcional)
  const enviarDados = async () => {
    if (!audioBlob) { alert("Grave um áudio antes de enviar."); return; }
    if (!nome || !telefone || !dataEntrega || !horaEntrega) {
      alert("Preencha todos os campos: nome, telefone, data e horário.");
      return;
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) { alert("Digite um telefone válido com DDD (ex: 11999999999)."); return; }

    setIsUploading(true);

    try {
      // 1️⃣ Nome do arquivo
      const nomeArquivo = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;

      // 2️⃣ Upload no Supabase
      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, { contentType: "audio/webm", cacheControl: "3600" });
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      // 3️⃣ URL pública
      const { data: publicData } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);
      // dependências do supabase podem variar; publicData.publicUrl ou publicData?.publicUrl
      const publicUrl = publicData?.publicUrl || (publicData && publicData.publicUrl) || "";

      // 4️⃣ OrderID do PayPal ou gerado
      const orderID = localStorage.getItem("currentOrderId") || `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 5️⃣ Dados do remetente (cliente)
      const telefoneRemetente = localStorage.getItem("clienteTelefone") || "00000000000";

      // 6️⃣ Monta o objeto para salvar
      const dadosParaSalvar = {
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        criado_em: new Date().toISOString(),
        enviado: false,
        link_midia: publicUrl,
        dados_completos: {
          tipo: "audio",
          order_id: orderID,
          paypal_order_id: orderID,
          status: "pago",
          valor: 5.00,
          cliente_nome: nome,
          cliente_telefone: telefoneLimpo,
          remetente: "Cliente",
          telefone_remetente: telefoneRemetente,
          destinatario: nome,
          telefone: telefoneLimpo,
          data_pagamento: new Date().toISOString()
        },
        evento_paypal: "FRONTEND_" + orderID,
        valor: 5.00
      };

      // 7️⃣ Inserir no Supabase (já existente)
      const { data, error } = await supabase.from("agendamentos").insert([dadosParaSalvar]).select();
      if (error) throw new Error("Erro ao salvar no Supabase: " + error.message);

      // 8️⃣ TENTAR salvar também na Firestore (opcional)
      // Se a Firestore estiver configurada via variáveis de ambiente, será gravado lá também.
      try {
        await salvarNaFirestore(dadosParaSalvar);
      } catch (fireErr) {
        // Não interrompe o fluxo principal; só loga
        console.warn("Não foi possível salvar na Firestore:", fireErr?.message || fireErr);
      }

      // 9️⃣ Guardar no localStorage para Saida.js
      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome,
        telefone: telefoneLimpo,
        dataEntrega,
        horaEntrega,
        tipo: "audio",
        link_midia: publicUrl,
        orderID,
        remetenteTelefone: telefoneRemetente
      }));

      alert(`🎉 Áudio agendado com sucesso!\n\n📞 Para: ${nome}\n📅 Data: ${dataEntrega}\n🕒 Hora: ${horaEntrega}`);

      setTimeout(() => { window.location.href = "/saida"; }, 2000);

    } catch (err) {
      alert(`❌ Ocorreu um erro:\n${err.message}`);
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>🎤 Gravador de Áudio - Máx 30s</h2>

      <div style={{ fontSize: 24, color: "#dc3545", fontWeight: "bold", background: "#ffebee", padding: "15px 25px", borderRadius: 25, textAlign: "center", marginBottom: 20 }}>
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button onClick={startRecording} style={{ fontSize: 22, padding: "18px 35px", background: "#007bff", color: "white", border: "none", borderRadius: 12, cursor: "pointer", width: "100%", marginBottom: 20 }}>
          🎙️ Iniciar Gravação (30s máx)
        </button>
      ) : (
        <div>
          <button onClick={stopRecording} style={{ fontSize: 22, padding: "18px 35px", background: "#dc3545", color: "white", border: "none", borderRadius: 12, cursor: "pointer", width: "100%", marginBottom: 15 }}>
            ⏹️ Parar Gravação ({tempoRestante}s)
          </button>
          <div style={{ fontSize: 20, color: "#dc3545", fontWeight: "bold", background: "#fff3cd", padding: "12px 20px", borderRadius: 20, textAlign: "center" }}>
            ⏳ Gravando... {tempoRestante}s restantes
          </div>
        </div>
      )}

      {audioURL && (
        <div style={{ marginTop: 30 }}>
          <p><strong>✅ Áudio gravado (pronto para enviar):</strong></p>
          <audio controls src={audioURL} style={{ width: "100%", marginBottom: 20 }} />
        </div>
      )}

      <hr style={{ margin: "40px 0" }} />

      <div style={{ display: "grid", gap: 15 }}>
        <input type="text" placeholder="👤 Nome do destinatário *" value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="tel" placeholder="📱 Telefone com DDD *" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <select value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}>
          <option value="">🕒 Escolha o horário *</option>
          <option value="09:00">09:00</option>
          <option value="10:00">10:00</option>
          <option value="11:00">11:00</option>
          <option value="14:00">14:00</option>
          <option value="15:00">15:00</option>
          <option value="16:00">16:00</option>
          <option value="17:00">17:00</option>
        </select>
      </div>

      <button onClick={enviarDados} disabled={!audioBlob || isUploading} style={{ marginTop: 30, padding: "18px 40px", fontSize: 20, background: (!audioBlob || isUploading) ? "#6c757d" : "#28a745", color: "white", border: "none", borderRadius: 12, cursor: (!audioBlob || isUploading) ? "not-allowed" : "pointer", width: "100%" }}>
        {isUploading ? "📤 Enviando para Supabase..." : "🚀 Enviar Áudio Agendado"}
      </button>
    </div>
  );
};

export default AudioRecordPage;
