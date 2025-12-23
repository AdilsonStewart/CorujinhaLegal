import React, { useState, useRef, useEffect } from "react";
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

const VideoRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [tempoRestante, setTempoRestante] = useState(30);

  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");

  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [aceitoTermos, setAceitoTermos] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [stream, setStream] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current && stream) {
      previewRef.current.srcObject = stream;
      previewRef.current.onloadedmetadata = () => {
        previewRef.current.play().catch(() => {});
      };
    }
  }, [stream]);

  const startRecording = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });

      setStream(newStream);
      chunksRef.current = [];

      const recorder = new MediaRecorder(newStream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoURL(URL.createObjectURL(blob));

        newStream.getTracks().forEach((t) => t.stop());
        setStream(null);
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
      alert("Permita o uso da câmera e do microfone.");
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
      alert("Você deve aceitar os Termos para continuar.");
      return;
    }

    if (!videoBlob) {
      alert("Grave o vídeo antes de enviar.");
      return;
    }

    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega) {
      alert("Preencha nome, telefone do destinatário e horário.");
      return;
    }

    const agora = new Date();
    const dataHorario = new Date(`${dataEntrega}T${horaEntrega}`);

    if (dataHorario < agora) {
      alert("⛔ Não é possível agendar no passado.");
      return;
    }

    const limite = new Date();
    limite.setDate(limite.getDate() + 365);
    if (dataHorario > limite) {
      alert("⛔ Agendamento máximo de 365 dias.");
      return;
    }

    try {
      const nomeArquivo = `video_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, videoBlob, { contentType: "video/webm" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("Midias")
        .getPublicUrl(nomeArquivo);

      const orderID = `VID-${Date.now()}`;
      const telefoneDest = sanitizePhone(destinatarioTelefone);

      const payload = {
        order_id: orderID,
        tipo: "video",
        link_midia: data?.publicUrl || "",
        criado_em: new Date().toISOString(),
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: destinatarioNome,
        telefone_destinatario: telefoneDest,
        remetente: remetenteNome,
        telefone_remetente: telefoneRem
      };

      await addDoc(collection(db, "agendamentos"), payload);

      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          telefone: telefoneDest,
          dataEntrega,
          horaEntrega,
          tipo: "video",
          orderID
        })
      );

      window.location.href = "/saida";

    } catch (err) {
      console.error(err);
      alert("Erro ao enviar vídeo.");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎥 Gravador de Vídeo – Máx 30s</h2>

      {isRecording && (
        <video
          ref={previewRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", marginBottom: 16 }}
        />
      )}

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
