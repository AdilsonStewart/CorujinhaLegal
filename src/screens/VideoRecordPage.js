import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Firestore client
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

// Supabase config
const supabaseUrl = "https://kuwsgvhjmjnhkteleczc.supabase.co";
const supabaseKey = "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P";
const supabase = createClient(supabaseUrl, supabaseKey);

// Util
const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const VideoRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);

  const [remetenteNome, setRemetenteNome] = useState("");
  const [remetenteTelefone, setRemetenteTelefone] = useState("");
  const [remetenteNascimento, setRemetenteNascimento] = useState("");

  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");

  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);

  useEffect(() => {
    return () => tempoIntervalRef.current && clearInterval(tempoIntervalRef.current);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      videoChunksRef.current = [];
      setVideoURL(null);
      setVideoBlob(null);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => videoChunksRef.current.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        setVideoBlob(blob);
        setVideoURL(url);

        stream.getTracks().forEach((track) => track.stop());
        clearInterval(tempoIntervalRef.current);
        setTempoRestante(30);
      };

      recorder.start();
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

    } catch (error) {
      alert("Não foi possível acessar câmera e microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const enviarDados = async () => {
    if (!videoBlob) {
      alert("Grave um vídeo antes de enviar.");
      return;
    }
    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega) {
      alert("Preencha destinatário, telefone e horário.");
      return;
    }
    if (!remetenteNascimento) {
      alert("Preencha a data de nascimento do remetente.");
      return;
    }

    setIsUploading(true);

    try {
      const dataAgendamento = dataEntrega || new Date().toISOString().slice(0, 10);

      const nomeArquivo = `video_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;

      // ✔ Upload para Supabase (MANTIDO)
      const { error } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, videoBlob, { contentType: "video/webm" });

      if (error) throw error;

      const { data } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);
      const publicUrl = data?.publicUrl || "";

      const orderID = `VID-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const telefoneDestClean = sanitizePhone(destinatarioTelefone);
      const telefoneRemClean = sanitizePhone(remetenteTelefone);

      // ✔ Firestore (MANTIDO)
      const payload = {
        order_id: orderID,
        tipo: "video",
        link_midia: publicUrl,
        criado_em: serverTimestamp(),
        data_agendamento: dataAgendamento,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: destinatarioNome,
        telefone: telefoneDestClean,
        remetente: remetenteNome,
        telefone_remetente: telefoneRemClean,
        remetente_nascimento: remetenteNascimento
      };

      await addDoc(collection(db, "agendamentos"), payload);

      // 🔥 localStorage SOMENTE após clicar em ENVIAR (MANTIDO)
      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          telefone: telefoneDestClean,
          dataEntrega: dataAgendamento,
          horario: horaEntrega,
          tipo: "video",
          orderID: orderID
        })
      );

      alert("🎉 Vídeo agendado com sucesso!");
      window.location.href = "/saida";

    } catch (err) {
      alert("Erro ao enviar.");
      console.error(err);
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎥 Gravador de Vídeo - Máx 30s</h2>

      <div style={{
        fontSize: 24,
        color: "#dc3545",
        fontWeight: "bold",
        background: "#ffebee",
        padding: 15,
        borderRadius: 12,
        textAlign: "center",
        marginBottom: 20
      }}>
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button onClick={startRecording} style={{ width: "100%", padding: 18 }}>
          🎬 Iniciar Gravação
        </button>
      ) : (
        <button onClick={stopRecording} style={{ width: "100%", padding: 18 }}>
          ⏹️ Parar Gravação
        </button>
      )}

      {videoURL && <video controls src={videoURL} style={{ width: "100%", marginTop: 16 }} />}

      <hr style={{ margin: "24px 0" }} />

      <div style={{ display: "grid", gap: 12 }}>

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

        <label>Data de nascimento *</label>
        <input
          type="date"
          value={remetenteNascimento}
          onChange={(e) => setRemetenteNascimento(e.target.value)}
        />

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

        <label>Data de entrega *</label>
        <input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
        />

        <label>Horário *</label>
        <select value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)}>
          <option value="">Selecione</option>
          <option value="09:00">09:00</option>
          <option value="10:00">10:00</option>
          <option value="11:00">11:00</option>
          <option value="14:00">14:00</option>
          <option value="15:00">15:00</option>
          <option value="16:00">16:00</option>
          <option value="17:00">17:00</option>
        </select>

      </div>

      <button
        onClick={enviarDados}
        style={{
          marginTop: 24,
          width: "100%",
          padding: 18,
          background: "#28a745",
          color: "white"
        }}
      >
        🚀 Enviar Vídeo Agendado
      </button>
    </div>
  );
};

export default VideoRecordPage;
