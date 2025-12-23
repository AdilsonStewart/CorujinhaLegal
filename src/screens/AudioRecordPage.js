import React, { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Firestore
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

// Supabase Config
const supabase = createClient(
  "https://kuwsgvhjmjnhkteleczc.supabase.co",
  "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P"
);

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const AudioRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");

  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const [aceitoTermos, setAceitoTermos] = useState(false);

  const mediaRecorderRef = useRef(null);
  const tempoIntervalRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        const blob = new Blob([e.data], { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(tempoIntervalRef.current);
        setTempoRestante(30);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      tempoIntervalRef.current = setInterval(() => {
        setTempoRestante((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

    } catch {
      alert("Permita o uso do microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const enviarDados = async () => {
    const telefoneRem = sanitizePhone(localStorage.getItem("clienteTelefone"));
    const remetenteNome = localStorage.getItem("clienteNome") || "";

    if (!telefoneRem) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    if (!aceitoTermos) {
      alert("Aceite os Termos de Uso.");
      return;
    }

    if (!audioBlob) {
      alert("Grave seu áudio antes de enviar.");
      return;
    }

    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega) {
      alert("Preencha nome, telefone do destinatário e horário.");
      return;
    }

    setIsUploading(true);

    try {
      const nomeArquivo = `audio_${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, { contentType: "audio/webm" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("Midias")
        .getPublicUrl(nomeArquivo);

      const orderID = `AUD-${Date.now()}`;

      const payload = {
        order_id: orderID,
        tipo: "audio",
        link_midia: data?.publicUrl || "",
        criado_em: new Date().toISOString(),
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: destinatarioNome,
        telefone_destinatario: sanitizePhone(destinatarioTelefone),
        remetente: remetenteNome,
        telefone_remetente: telefoneRem
      };

      await addDoc(collection(db, "agendamentos"), payload);

      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          dataEntrega,
          horaEntrega,
          tipo: "audio",
          orderID,
          telefone: destinatarioTelefone
        })
      );

      window.location.href = "/saida";

    } catch (err) {
      console.error(err);
      alert("Erro ao enviar áudio.");
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎤 Gravador de Áudio – Máx 30s</h2>

      <div
        style={{
          fontSize: 24,
          color: "#dc3545",
          fontWeight: "bold",
          background: "#ffebee",
          padding: "15px",
          borderRadius: 12,
          marginBottom: 20,
          textAlign: "center"
        }}
      >
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button
          onClick={startRecording}
          style={{ width: "100%", padding: 18, background: "#007bff", color: "white", borderRadius: 12 }}
        >
          🎙️ Iniciar Gravação
        </button>
      ) : (
        <button
          onClick={stopRecording}
          style={{ width: "100%", padding: 18, background: "#dc3545", color: "white", borderRadius: 12 }}
        >
          ⏹️ Parar Gravação
        </button>
      )}

      {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginTop: 16 }} />}

      <hr style={{ margin: "24px 0" }} />

      <div style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Nome do destinatário"
          value={destinatarioNome}
          onChange={(e) => setDestinatarioNome(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Telefone do destinatário"
          value={destinatarioTelefone}
          onChange={(e) => setDestinatarioTelefone(e.target.value)}
        />

        <label>Data de entrega da mensagem *</label>
        <input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
        />

        <label>Horário disponível *</label>
        <select value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)}>
          <option value="">Selecione</option>
          <option value="08:00">08:00</option>
          <option value="10:00">10:00</option>
          <option value="12:00">12:00</option>
          <option value="14:00">14:00</option>
          <option value="16:00">16:00</option>
          <option value="18:00">18:00</option>
        </select>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <input
          type="checkbox"
          checked={aceitoTermos}
          onChange={(e) => setAceitoTermos(e.target.checked)}
        />{" "}
        Eu li e aceito os <Link to="/termos">Termos de Uso</Link>
      </div>

      <button
        onClick={enviarDados}
        style={{ marginTop: 24, width: "100%", padding: 18, background: "#28a745", color: "white", borderRadius: 12 }}
        disabled={isUploading}
      >
        🚀 Enviar Áudio Agendado
      </button>
    </div>
  );
};

export default AudioRecordPage;
