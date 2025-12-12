import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./AudioRecordPage.css";

// SUPABASE
import { createClient } from "@supabase/supabase-js";

// FIREBASE
import { db } from "../firebase/config";
import { doc, collection, addDoc } from "firebase/firestore";

// 🔧 Conexão Supabase
const supabase = createClient(
  "https://kuwsgvhjmjnhkteleczc.supabase.co",
  "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P"
);

export default function AudioRecordPage() {
  const navigate = useNavigate();
  const mediaRecorderRef = useRef(null);
  const [audioURL, setAudioURL] = useState(null);
  const [blobAudio, setBlobAudio] = useState(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // ▶️ INICIAR GRAVAÇÃO
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setBlobAudio(blob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      alert("Erro ao acessar microfone!");
    }
  };

  // ⏹️ PARAR GRAVAÇÃO
  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // 💾 ENVIAR ÁUDIO PARA SUPABASE
  const uploadToSupabase = async () => {
    if (!blobAudio) {
      alert("Grave algo antes de continuar!");
      return null;
    }

    const fileName = `audio_${Date.now()}.webm`;
    const file = new File([blobAudio], fileName, { type: "audio/webm" });

    const { data, error } = await supabase.storage
      .from("audios")
      .upload(fileName, file);

    if (error) {
      console.error("Erro Supabase:", error);
      alert("Erro ao enviar arquivo");
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from("audios")
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  };

  // ⭐ SALVAR NO FIRESTORE
  const salvarNoFirestore = async (audioUrl) => {
    try {
      const clienteId = localStorage.getItem("clienteId");

      if (!clienteId) {
        alert("Erro: cliente não encontrado!");
        return;
      }

      await addDoc(
        collection(db, "clientes", clienteId, "mensagens"),
        {
          link: audioUrl,
          criadoEm: new Date().toISOString(),
          timestamp: Date.now(),
        }
      );
    } catch (err) {
      console.error("Erro Firestore:", err);
    }
  };

  // ⭐ BOTÃO FINAL - PROCESSO COMPLETO
  const finalizar = async () => {
    if (!blobAudio) {
      alert("Grave algo antes!");
      return;
    }

    setLoading(true);

    // 1) Sobe para Supabase
    const linkFinal = await uploadToSupabase();

    if (!linkFinal) {
      setLoading(false);
      return;
    }

    // 2) Salva no localStorage (usado pelo agendamento)
    localStorage.setItem("lastRecordingUrl", linkFinal);

    // 3) Salva no Firestore dentro do cliente
    await salvarNoFirestore(linkFinal);

    setLoading(false);

    navigate("/agendamento");
  };

  return (
    <div className="audio-page">
      <h1 className="titulo">Gravar Mensagem de Áudio</h1>

      {!recording && !audioURL && (
        <button className="btn iniciar" onClick={startRecording}>
          🎙️ Iniciar Gravação
        </button>
      )}

      {recording && (
        <button className="btn parar" onClick={stopRecording}>
          ⏹️ Parar Gravação
        </button>
      )}

      {audioURL && (
        <>
          <audio controls src={audioURL} className="player" />

          <button className="btn gravar-novamente" onClick={startRecording}>
            🔁 Gravar Novamente
          </button>

          <button
            className="btn finalizar"
            onClick={finalizar}
            disabled={loading}
          >
            {loading ? "Enviando..." : "Salvar e Continuar"}
          </button>
        </>
      )}
    </div>
  );
}
