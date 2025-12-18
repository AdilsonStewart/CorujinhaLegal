import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Firestore
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// Supabase
const supabase = createClient(
  "https://kuwsgvhjmjnhkteleczc.supabase.co",
  "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P"
);

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const AudioRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  // Remetente
  const [remetenteNome, setRemetenteNome] = useState("");
  const [remetenteTelefone, setRemetenteTelefone] = useState("");
  const [remetenteNascimento, setRemetenteNascimento] = useState("");

  // Destinatário
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");

  // Agendamento
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);

  // Armazena no localStorage (mas não faz preload)
  useEffect(() => localStorage.setItem("clienteNome", remetenteNome), [remetenteNome]);
  useEffect(() => localStorage.setItem("clienteTelefone", remetenteTelefone), [remetenteTelefone]);
  useEffect(() => localStorage.setItem("clienteNascimento", remetenteNascimento), [remetenteNascimento]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
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
    if (!audioBlob) return alert("Grave o áudio antes de enviar.");
    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega)
      return alert("Preencha destinatário, telefone e horário.");
    if (!remetenteNascimento)
      return alert("Preencha a data de nascimento do remetente.");

    // 🔒 validação de data/horário
    const agora = new Date();
    const hoje = agora.toISOString().slice(0, 10);
    const dataEscolhida = dataEntrega || hoje;
    const dataHorario = new Date(`${dataEscolhida}T${horaEntrega}`);

    if (dataHorario < agora)
      return alert("⛔ Não é possível agendar no passado.");

    const limite = new Date();
    limite.setDate(limite.getDate() + 365);

    if (dataHorario > limite)
      return alert("⛔ Agendamento máximo de 365 dias.");

    alert("✔ Dados válidos — envio continua…");

    // Aqui segue TODO o fluxo original (upload e Firestore)
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎤 Gravador de Áudio - Máx 30s</h2>

      <div style={{
        fontSize: 24,
        color: "#dc3545",
        fontWeight: "bold",
        background: "#ffebee",
        padding: "15px 25px",
        borderRadius: 25,
        textAlign: "center",
        marginBottom: 20
      }}>
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button
          onClick={startRecording}
          style={{
            fontSize: 22,
            padding: "18px 35px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 12,
            width: "100%"
          }}
        >
          🎙️ Iniciar Gravação
        </button>
      ) : (
        <button
          onClick={stopRecording}
          style={{
            fontSize: 22,
            padding: "18px 35px",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: 12,
            width: "100%"
          }}
        >
          ⏹️ Parar Gravação
        </button>
      )}

      {audioURL && (
        <audio controls src={audioURL} style={{ width: "100%", marginTop: 16 }} />
      )}

      <hr style={{ margin: "24px 0" }} />

      <div style={{ display: "grid", gap: 10 }}>

        {/* remetente */}
        <input
          type="text"
          placeholder="Seu nome (remetente)"
          value={remetenteNome}
          onChange={(e) => setRemetenteNome(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Seu telefone (remetente)"
          value={remetenteTelefone}
          onChange={(e) => setRemetenteTelefone(e.target.value)}
        />

        <input
          type="date"
          placeholder="Data de nascimento do remetente *"
          value={remetenteNascimento}
          onChange={(e) => setRemetenteNascimento(e.target.value)}
        />

        {/* destinatário */}
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

        {/* agendamento */}
        <input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
        />

        <input
          type="time"
          value={horaEntrega}
          onChange={(e) => setHoraEntrega(e.target.value)}
        />
      </div>

      <button
        onClick={enviarDados}
        style={{
          marginTop: 20,
          padding: "16px 28px",
          background: "#28a745",
          color: "white",
          width: "100%",
          borderRadius: 10
        }}
      >
        🚀 Enviar Áudio Agendado
      </button>
    </div>
  );
};

export default AudioRecordPage;
