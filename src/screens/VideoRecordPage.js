import React, { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Firestore
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

// Supabase Config
const supabase = createClient(
  "https://kuwsgvhjmjnhkteleczc.supabase.co",
  "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P"
);

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const VideoRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [tempoRestante, setTempoRestante] = useState(30);

  // remetente
  const [remetenteNome, setRemetenteNome] = useState("");
  const [remetenteTelefone, setRemetenteTelefone] = useState("");
  const [remetenteNascimento, setRemetenteNascimento] = useState("");

  // destinatário
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");

  // agendamento
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // 👇 ADIÇÃO: referência para preview ao vivo
  const previewRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      chunksRef.current = [];

      // 👇 ADIÇÃO: mostrar câmera AO VIVO
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoURL(URL.createObjectURL(blob));

        // 👇 ADIÇÃO: desligar preview ao parar
        if (previewRef.current) {
          previewRef.current.srcObject?.getTracks().forEach((t) => t.stop());
          previewRef.current.srcObject = null;
        }

        stream.getTracks().forEach((t) => t.stop());
        setTempoRestante(30);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      const interval = setInterval(() => {
        setTempoRestante((prev) => {
          if (prev <= 1) {
            stopRecording();
            clearInterval(interval);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

    } catch {
      alert("Permita o uso da câmera e microfone.");
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

    const agora = new Date();
    const dataHorario = new Date(`${dataEntrega}T${horaEntrega}`);

    if (dataHorario < agora)
      return alert("⛔ Não é possível agendar no passado.");

    const limite = new Date();
    limite.setDate(limite.getDate() + 365);
    if (dataHorario > limite)
      return alert("⛔ Agendamento máximo de 365 dias.");

    try {
      const nomeArquivo = `video_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, videoBlob, { contentType: "video/webm" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);
      const publicUrl = data?.publicUrl || "";

      const orderID = `VID-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const telefoneDest = sanitizePhone(destinatarioTelefone);
      const telefoneRem = sanitizePhone(remetenteTelefone);

      const payload = {
        order_id: orderID,
        tipo: "video",
        link_midia: publicUrl,
        criado_em: new Date().toISOString(),
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: destinatarioNome,
        telefone: telefoneDest,
        remetente: remetenteNome,
        telefone_remetente: telefoneRem,
        remetente_nascimento: remetenteNascimento,
      };

      await addDoc(collection(db, "agendamentos"), payload);

      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          telefone: telefoneDest,
          dataEntrega,
          horario: horaEntrega,
          tipo: "video",
          orderID
        })
      );

      alert("🎉 Vídeo agendado com sucesso!");
      window.location.href = "/saida";

    } catch (err) {
      console.error(err);
      alert("Erro ao enviar.");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎥 Gravador de Vídeo - Máx 30s</h2>

      {/* 👇 ADIÇÃO: câmera AO VIVO no topo */}
      {isRecording && (
        <video
          ref={previewRef}
          autoPlay
          muted
          style={{ width: "100%", marginBottom: 16 }}
        />
      )}

      <div style={{
        fontSize: 24,
        color: "#dc3545",
        fontWeight: "bold",
        background: "#ffebee",
        padding: "15px",
        borderRadius: 12,
        marginBottom: 20,
        textAlign: "center"
      }}>
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button
          onClick={startRecording}
          style={{ width: "100%", padding: 18, background: "#007bff", color: "white", borderRadius: 12 }}
        >
          🎬 Iniciar Gravação
        </button>
      ) : (
        <button
          onClick={stopRecording}
          style={{ width: "100%", padding: 18, background: "#dc3545", color: "white", borderRadius: 12 }}
        >
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

        <label>Data de nascimento do remetente *</label>
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

      <button
        onClick={enviarDados}
        style={{
          marginTop: 24,
          width: "100%",
          padding: 18,
          background: "#28a745",
          color: "white",
          borderRadius: 12
        }}
      >
        🚀 Enviar Vídeo Agendado
      </button>
    </div>
  );
};

export default VideoRecordPage;
