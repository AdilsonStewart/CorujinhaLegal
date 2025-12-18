import React, { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

const supabase = createClient(
  "https://kuwsgvhjmjnhkteleczc.supabase.co",
  "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P"
);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      videoChunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => videoChunksRef.current.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoURL(url);
        stream.getTracks().forEach((t) => t.stop());
        setTempoRestante(30);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert("Permita câmera e microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const enviarDados = async () => {
    if (!videoBlob) return alert("Grave o vídeo antes de enviar.");
    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega)
      return alert("Preencha destinatário, telefone e horário.");
    if (!remetenteNascimento)
      return alert("Preencha a data de nascimento do remetente.");

    setIsUploading(true);

    try {
      const hojeIso = new Date().toISOString().slice(0, 10);
      const dataAgendamento = dataEntrega || hojeIso;

      const nomeArquivo = `video_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, videoBlob, { contentType: "video/webm" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("Midias")
        .getPublicUrl(nomeArquivo);

      const publicUrl = data?.publicUrl || "";

      const orderID = `VIDEO-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const telefoneDest = sanitizePhone(destinatarioTelefone);
      const telefoneRem = sanitizePhone(remetenteTelefone);

      const payload = {
        order_id: orderID,
        tipo: "video",
        link_midia: publicUrl,
        criado_em: new Date().toISOString(),
        data_agendamento: dataAgendamento,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: { nome: destinatarioNome, telefone: telefoneDest },
        remetente: {
          nome: remetenteNome,
          telefone: telefoneRem,
          nascimento: remetenteNascimento
        },
        telefone: telefoneDest,
        criado_em_ts: serverTimestamp()
      };

      const col = collection(db, "agendamentos");
      const docRef = await addDoc(col, payload);

      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          telefone: telefoneDest,
          dataEntrega: dataAgendamento,
          horaEntrega,
          tipo: "video",
          link_midia: publicUrl,
          orderID,
          firestore_doc_id: docRef.id
        })
      );

      // 🔹 Apenas agora: salvar telefone do cliente para Minhas Mensagens
      localStorage.setItem("clienteTelefone", telefoneRem);

      alert("Vídeo agendado com sucesso!");
      window.location.href = "/saida";
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar vídeo.");
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎥 Gravador de Vídeo - Máx 30s</h2>

      <div style={{ background: "#ffe5e5", padding: 10, borderRadius: 8 }}>
        ⏱️ {tempoRestante}s
      </div>

      {!isRecording ? (
        <button onClick={startRecording} style={{ width: "100%" }}>
          🎬 Iniciar Gravação
        </button>
      ) : (
        <button onClick={stopRecording} style={{ width: "100%" }}>
          ⏹️ Parar Gravação
        </button>
      )}

      {videoURL && <video controls src={videoURL} style={{ width: "100%", marginTop: 10 }} />}

      <hr />

      <label>Seu nome</label>
      <input value={remetenteNome} onChange={(e) => setRemetenteNome(e.target.value)} />

      <label>Seu telefone</label>
      <input value={remetenteTelefone} onChange={(e) => setRemetenteTelefone(e.target.value)} />

      <label>Data de nascimento</label>
      <input type="date" value={remetenteNascimento} onChange={(e) => setRemetenteNascimento(e.target.value)} />

      <label>Nome do destinatário</label>
      <input value={destinatarioNome} onChange={(e) => setDestinatarioNome(e.target.value)} />

      <label>Telefone do destinatário</label>
      <input value={destinatarioTelefone} onChange={(e) => setDestinatarioTelefone(e.target.value)} />

      <label>Data de entrega</label>
      <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />

      <label>Horário de entrega</label>
      <select value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)}>
        <option value="">Escolha horário</option>
        <option value="09:00">09:00</option>
        <option value="12:00">12:00</option>
        <option value="14:00">14:00</option>
        <option value="16:00">16:00</option>
        <option value="18:00">18:00</option>
      </select>

      <button
        onClick={enviarDados}
        disabled={isUploading}
        style={{ width: "100%", marginTop: 20 }}
      >
        🚀 Enviar Vídeo Agendado
      </button>
    </div>
  );
};

export default VideoRecordPage;
