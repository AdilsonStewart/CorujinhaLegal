import React, { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔧 SUPABASE (use as mesmas chaves que já funcionam no projeto)
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
  };

  const parar = () => {
    mediaRecorderRef.current.stop();
    setGravando(false);
  };

  const enviar = async () => {
    if (!audioBlob) return alert("Grave o áudio primeiro");

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

      // 3️⃣ Salvar agendamento SIMPLES
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

    } catch (err) {
      alert("❌ Erro: " + err.message);
    }

    setEnviando(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: "50px auto", textAlign: "center" }}>
      <h2>🦉 Gravar Áudio (página nova)</h2>

      {!gravando ? (
        <button onClick={iniciar}>🎙️ Iniciar</button>
      ) : (
        <button onClick={parar}>⏹️ Parar</button>
      )}

      {audioURL && (
        <div style={{ marginTop: 20 }}>
          <audio controls src={audioURL} />
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <button onClick={enviar} disabled={enviando}>
          {enviando ? "Enviando..." : "🚀 Enviar áudio"}
        </button>
      </div>
    </div>
  );
};

export default GravarAudio;
