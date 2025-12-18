import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Firestore client SDK (mesmo import usado no AudioRecordPage)
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
  doc,
  setDoc
} from "firebase/firestore";

console.log("🔥 VIDEO RECORD PAGE — FIRESTORE FLOW 🔥", Date.now());

// Supabase config
const supabaseUrl = "https://kuwsgvhjmjnhkteleczc.supabase.co";
const supabaseKey = "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P";
const supabase = createClient(supabaseUrl, supabaseKey);

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const VideoRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);

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
  const videoChunksRef = useRef([]);

  useEffect(() => {
    try {
      setRemetenteNome(localStorage.getItem("clienteNome") || "");
      setRemetenteTelefone(localStorage.getItem("clienteTelefone") || "");
      setRemetenteNascimento(localStorage.getItem("clienteNascimento") || "");
    } catch {}
  }, []);

  useEffect(() => localStorage.setItem("clienteNome", remetenteNome), [remetenteNome]);
  useEffect(() => localStorage.setItem("clienteTelefone", remetenteTelefone), [remetenteTelefone]);
  useEffect(() => localStorage.setItem("clienteNascimento", remetenteNascimento), [remetenteNascimento]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoChunksRef.current = [];
      setVideoURL(null);
      setVideoBlob(null);

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => videoChunksRef.current.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setTempoRestante(30);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      alert("Permita o uso da câmera e microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const enviarDados = async () => {
    if (!videoBlob) return alert("Grave um vídeo.");
    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega)
      return alert("Preencha destinatário, telefone e horário.");
    if (!remetenteNascimento)
      return alert("Preencha nascimento do remetente.");

    setIsUploading(true);

    try {
      const nomeArquivo = `video_${Date.now()}.webm`;

      const { error } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, videoBlob, { contentType: "video/webm" });

      if (error) throw error;

      const { data } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);
      const publicUrl = data?.publicUrl || "";

      const orderID = `VIDEO-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const payload = {
        order_id: orderID,
        tipo: "video",
        link_midia: publicUrl,
        criado_em: serverTimestamp(),
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        destinatario: {
          nome: destinatarioNome,
          telefone: sanitizePhone(destinatarioTelefone)
        },
        remetente: {
          nome: remetenteNome,
          telefone: sanitizePhone(remetenteTelefone),
          nascimento: remetenteNascimento
        },
        enviado: false
      };

      const docRef = await addDoc(collection(db, "agendamentos"), payload);

      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome: destinatarioNome,
        telefone: destinatarioTelefone,
        dataEntrega,
        horaEntrega,
        tipo: "video",
        link_midia: publicUrl,
        orderID,
        firestoreId: docRef.id
      }));

      window.location.href = "/saida";
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar.");
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🎥 Gravador de Vídeo - Máx 30s</h2>

      {!isRecording ? (
        <button onClick={startRecording}>🎬 Iniciar Gravação</button>
      ) : (
        <button onClick={stopRecording}>⏹️ Parar</button>
      )}

      {videoURL && <video controls src={videoURL} style={{ width: "100%" }} />}

      <hr />

      <input placeholder="Seu nome (remetente)" value={remetenteNome} onChange={(e) => setRemetenteNome(e.target.value)} />
      <input placeholder="Seu telefone (remetente)" value={remetenteTelefone} onChange={(e) => setRemetenteTelefone(e.target.value)} />
      <input type="date" value={remetenteNascimento} onChange={(e) => setRemetenteNascimento(e.target.value)} />

      <input placeholder="Nome do destinatário" value={destinatarioNome} onChange={(e) => setDestinatarioNome(e.target.value)} />
      <input placeholder="Telefone do destinatário" value={destinatarioTelefone} onChange={(e) => setDestinatarioTelefone(e.target.value)} />

      <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
      <input type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} />

      <button onClick={enviarDados} disabled={isUploading}>
        🚀 Enviar Vídeo Agendado
      </button>
    </div>
  );
};

export default VideoRecordPage;
