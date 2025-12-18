import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
  const tempoIntervalRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      videoChunksRef.current = [];
      setVideoURL(null);
      setVideoBlob(null);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) =>
        videoChunksRef.current.push(event.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoURL(url);
        stream.getTracks().forEach((track) => track.stop());
        if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
        setTempoRestante(30);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
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
      alert("⚠️ Permita o uso da câmera e microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
      setTempoRestante(30);
    }
  };

  const enviarDados = async () => {
    if (!videoBlob) return alert("🎥 Grave o vídeo antes de enviar.");
    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega)
      return alert("⚠️ Preencha destinatário, telefone e horário.");
    if (!remetenteNascimento)
      return alert("⚠️ Preencha a data de nascimento do remetente.");

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

      const telefoneDestClean = sanitizePhone(destinatarioTelefone);
      const telefoneRemClean = sanitizePhone(remetenteTelefone);

      const payload = {
        order_id: orderID,
        tipo: "video",
        link_midia: publicUrl,
        criado_em: new Date().toISOString(),
        data_agendamento: dataAgendamento,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: {
          nome: destinatarioNome,
          telefone: telefoneDestClean
        },
        remetente: {
          nome: remetenteNome,
          telefone: telefoneRemClean,
          nascimento: remetenteNascimento
        },
        telefone: telefoneDestClean
      };

      const col = collection(db, "agendamentos");
      const docRef = await addDoc(col, payload);

      // 🟢 agora sim: salvar apenas após envio
      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          telefone: telefoneDestClean,
          dataEntrega: dataAgendamento,
          horaEntrega,
          tipo: "video",
          link_midia: publicUrl,
          orderID,
          firestore_doc_id: docRef.id
        })
      );

      // ⚠️ SAVE APENAS O NECESSÁRIO PARA MINHAS MENSAGENS
      localStorage.setItem("clienteTelefone", telefoneRemClean);
      localStorage.setItem("clienteId", telefoneRemClean);

      alert("🎉 Vídeo agendado com sucesso!");
      window.location.href = "/saida";
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao enviar vídeo.");
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎥 Gravador de Vídeo - Máx 30s</h2>

      <div
        style={{
          fontSize: 24,
          color: "#dc3545",
          background: "#ffebee",
          padding: "10px",
          textAlign: "center",
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        ⏱️ {tempoRestante}s restantes
      </div>

      {!isRecording ? (
        <button onClick={startRecording}>🎬 Iniciar Gravação</button>
      ) : (
        <button onClick={stopRecording}>⏹️ Parar Gravação</button>
      )}

      {videoURL && <video controls src={videoURL} style={{ width: "100%" }} />}

      <hr style={{ margin: "24px 0" }} />

      <input
        placeholder="Seu nome (remetente)"
        value={remetenteNome}
        onChange={(e) => setRemetenteNome(e.target.value)}
      />
      <input
        placeholder="Seu telefone (remetente)"
        value={remetenteTelefone}
        onChange={(e) => setRemetenteTelefone(e.target.value)}
      />
      <input
        type="date"
        value={remetenteNascimento}
        onChange={(e) => setRemetenteNascimento(e.target.value)}
      />

      <input
        placeholder="Nome do destinatário"
        value={destinatarioNome}
        onChange={(e) => setDestinatarioNome(e.target.value)}
      />
      <input
        placeholder="Telefone do destinatário"
        value={destinatarioTelefone}
        onChange={(e) => setDestinatarioTelefone(e.target.value)}
      />

      <input
        type="date"
        value={dataEntrega}
        onChange={(e) => setDataEntrega(e.target.value)}
      />

      <select value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)}>
        <option value="">Escolha horário</option>
        <option value="09:00">09:00</option>
        <option value="12:00">12:00</option>
        <option value="14:00">14:00</option>
        <option value="16:00">16:00</option>
        <option value="18:00">18:00</option>
      </select>

      <button onClick={enviarDados}>🚀 Enviar Vídeo Agendado</button>
    </div>
  );
};

export default VideoRecordPage;
