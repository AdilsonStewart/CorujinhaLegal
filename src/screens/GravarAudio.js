import React, { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./GravarAudio.css";

// 🔧 SUPABASE (mesmas chaves do projeto)
const supabaseUrl = "https://kuwsgvhjmjnhkteleczc.supabase.co";
const supabaseKey = "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P";
const supabase = createClient(supabaseUrl, supabaseKey);

const GravarAudio = () => {
  const [gravando, setGravando] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const iniciar = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setGravando(true);
    } catch (err) {
      alert("❌ Não foi possível acessar o microfone");
    }
  };

  const parar = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setGravando(false);
    }
  };

  const enviar = async () => {
    if (!audioBlob) {
      alert("Grave o áudio primeiro");
      return;
    }

    setEnviando(true);

    try {
      const nomeArquivo = `audio_${Date.now()}.webm`;

      // 1️⃣ Upload do áudio
      const { error } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, { contentType: "audio/webm" });

      if (error) throw error;

      // 2️⃣ URL pública
      const { data } = supabase.storage
        .from("Midias")
        .getPublicUrl(nomeArquivo);

      // 3️⃣ Registro simples no banco
      const payload = {
        tipo: "audio",
        link_midia: data.publicUrl,
        criado_em: new Date().toISOString(),
        enviado: false,
      };

      const { error: dbError } = await supabase
        .from("agendamentos")
        .insert([payload]);

      if (dbError) throw dbError;

      alert("✅ Áudio salvo com sucesso");

      setAudioBlob(null);
      setAudioURL(null);

    } catch (err) {
      alert("❌ Erro ao enviar: " + err.message);
    }

    setEnviando(false);
  };

  return (
    <div className="gravar-audio-container">
      <h2>🦉 Gravar Áudio</h2>

      {!gravando ? (
        <button
          className="gravar-audio-btn btn-iniciar"
          onClick={iniciar}
        >
          🎙️ Iniciar gravação
        </button>
      ) : (
        <button
          className="gravar-audio-btn btn-parar"
          onClick={parar}
        >
          ⏹️ Parar gravação
        </button>
      )}

      {audioURL && (
        <div className="audio-preview">
          <audio controls src={audioURL} />
        </div>
      )}

      <button
        className={`gravar-audio-btn btn-enviar ${enviando ? "btn-desabilitado" : ""}`}
        onClick={enviar}
        disabled={enviando}
      >
        {enviando ? "Enviando..." : "🚀 Enviar áudio"}
      </button>
    </div>
  );
};

export default GravarAudio;
