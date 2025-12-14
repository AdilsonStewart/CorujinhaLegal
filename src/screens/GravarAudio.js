import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔐 SUPABASE
const supabaseUrl = "https://kuwsgvhjmjnhkteleczc.supabase.co";
const supabaseKey = "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function GravarAudio() {
  const [gravando, setGravando] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [tempo, setTempo] = useState(30);
  const [enviando, setEnviando] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // 📦 DADOS DO CLIENTE / AGENDAMENTO
  const nome = localStorage.getItem("clienteNome") || "";
  const telefone = localStorage.getItem("clienteTelefone") || "";
  const dataEntrega = localStorage.getItem("dataEntrega") || "";
  const horaEntrega = localStorage.getItem("horaEntrega") || "";
  const orderID =
    localStorage.getItem("orderID") ||
    `AUDIO-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 🎙️ INICIAR
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setTempo(30);
      };

      recorder.start();
      setGravando(true);

      timerRef.current = setInterval(() => {
        setTempo((t) => {
          if (t <= 1) {
            pararGravacao();
            return 30;
          }
          return t - 1;
        });
      }, 1000);
    } catch {
      alert("❌ Permissão de microfone negada");
    }
  };

  // ⏹️ PARAR
  const pararGravacao = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      setGravando(false);
    }
  };

  // 🚀 ENVIAR
  const enviarAudio = async () => {
    if (!audioBlob) {
      alert("❌ Grave um áudio primeiro");
      return;
    }

    setEnviando(true);

    try {
      const nomeArquivo = `audio_${orderID}.webm`;

      // 📤 UPLOAD
      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, {
          contentType: "audio/webm",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("Midias")
        .getPublicUrl(nomeArquivo);

      const linkAudio = data.publicUrl;

      // 💾 SALVAR AGENDAMENTO
      const payload = {
        tipo: "audio",
        order_id: orderID,
        status: "pago",
        cliente_nome: nome,
        cliente_telefone: telefone,
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        link_midia: linkAudio,
        criado_em: new Date().toISOString(),
        enviado: false,
        valor: 5,
        evento_paypal: "FRONTEND",
      };

      const { error } = await supabase.from("agendamentos").insert([payload]);
      if (error) throw error;

      alert("✅ Áudio gravado e salvo com sucesso!");
      window.location.href = "/saida";
    } catch (err) {
      alert("❌ Erro ao salvar: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2>🎤 Gravar Áudio</h2>

      <p>
        <strong>Cliente:</strong> {nome} <br />
        <strong>Telefone:</strong> {telefone} <br />
        <strong>Entrega:</strong> {dataEntrega} às {horaEntrega}
      </p>

      <h3>⏱️ Tempo: {tempo}s</h3>

      {!gravando ? (
        <button onClick={iniciarGravacao} style={btnBlue}>
          🎙️ Iniciar
        </button>
      ) : (
        <button onClick={pararGravacao} style={btnRed}>
          ⏹️ Parar
        </button>
      )}

      {audioURL && (
        <>
          <audio controls src={audioURL} style={{ width: "100%", marginTop: 20 }} />
          <button
            onClick={enviarAudio}
            disabled={enviando}
            style={{ ...btnGreen, marginTop: 20 }}
          >
            🚀 Enviar Áudio
          </button>
        </>
      )}
    </div>
  );
}

// 🎨 BOTÕES
const btnBlue = {
  width: "100%",
  padding: 15,
  fontSize: 18,
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 8,
};

const btnRed = {
  ...btnBlue,
  background: "#dc3545",
};

const btnGreen = {
  ...btnBlue,
  background: "#28a745",
};
