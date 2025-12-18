import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const supabase = createClient(
  "https://kuwsgvhjmjnhkteleczc.supabase.co",
  "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P"
);

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");

const AudioRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

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
  const audioChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);

  // localStorage básico
  useEffect(() => localStorage.setItem("remetenteNome", remetenteNome), [remetenteNome]);
  useEffect(() => localStorage.setItem("remetenteTelefone", remetenteTelefone), [remetenteTelefone]);
  useEffect(() => localStorage.setItem("remetenteNascimento", remetenteNascimento), [remetenteNascimento]);
  useEffect(() => localStorage.setItem("destinatarioNome", destinatarioNome), [destinatarioNome]);
  useEffect(() => localStorage.setItem("destinatarioTelefone", destinatarioTelefone), [destinatarioTelefone]);
  useEffect(() => localStorage.setItem("dataEntrega", dataEntrega), [dataEntrega]);
  useEffect(() => localStorage.setItem("horaEntrega", horaEntrega), [horaEntrega]);

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
        stream.getTracks().forEach(t => t.stop());
        clearInterval(tempoIntervalRef.current);
        setTempoRestante(30);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      tempoIntervalRef.current = setInterval(() => {
        setTempoRestante(prev => {
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
    if (!audioBlob) return alert("Grave o áudio antes.");
    if (!remetenteNascimento) return alert("Informe nascimento do remetente.");
    if (!destinatarioNome) return alert("Informe o destinatário.");
    if (!destinatarioTelefone) return alert("Informe telefone.");
    if (!dataEntrega) return alert("Selecione a data.");
    if (!horaEntrega) return alert("Selecione o horário.");

    const agora = new Date();
    const dataHorario = new Date(`${dataEntrega}T${horaEntrega}`);

    if (dataHorario < agora) return alert("Não é possível agendar no passado.");

    const limite = new Date();
    limite.setDate(limite.getDate() + 365);
    if (dataHorario > limite) return alert("Agendamento máximo 365 dias.");

    setIsUploading(true);

    try {
      const fileName = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`;

      const { error } = await supabase.storage
        .from("Midias")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });

      if (error) throw error;

      const { data } = supabase.storage.from("Midias").getPublicUrl(fileName);

      const orderID = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // salva no Firestore (payload completo)
      await addDoc(collection(db, "agendamentos"), {
        order_id: orderID,
        tipo: "audio",
        link_midia: data?.publicUrl || "",
        criado_em: new Date().toISOString(),
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: destinatarioNome,
        telefone: sanitizePhone(destinatarioTelefone),
        remetente: remetenteNome,
        telefone_remetente: sanitizePhone(remetenteTelefone),
        remetente_nascimento: remetenteNascimento
      });

      // salva para Saida.js com nomes CORRETOS
      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          telefone: sanitizePhone(destinatarioTelefone),
          dataEntrega: dataEntrega,
          horario: horaEntrega,
          tipo: "audio",
          orderID: orderID
        })
      );

      alert("🎉 Áudio agendado com sucesso!");
      window.location.href = "/saida";

    } catch (e) {
      console.log(e);
      alert("Erro ao enviar.");
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>

      <h2>🎤 Gravador de Áudio - Máx 30s</h2>

      <div style={{
        fontSize: 24,
        color: "#dc3545",
        background: "#ffebee",
        padding: 15,
        borderRadius: 12,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20
      }}>
        ⏱ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button onClick={startRecording} style={{ padding: 18, width: "100%" }}>
          🎙️ Iniciar Gravação
        </button>
      ) : (
        <button onClick={stopRecording} style={{ padding: 18, width: "100%" }}>
          ⏹️ Parar Gravação
        </button>
      )}

      {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginTop: 16 }} />}

      <hr />

      <div style={{ display: "grid", gap: 12 }}>

        <input
          type="text"
          placeholder="Seu nome (remetente)"
          value={remetenteNome}
          onChange={e => setRemetenteNome(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Seu telefone (remetente)"
          value={remetenteTelefone}
          onChange={e => setRemetenteTelefone(e.target.value)}
        />

        <label>Data de nascimento *</label>
        <input
          type="date"
          value={remetenteNascimento}
          onChange={e => setRemetenteNascimento(e.target.value)}
        />

        <input
          type="text"
          placeholder="Nome do destinatário"
          value={destinatarioNome}
          onChange={e => setDestinatarioNome(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Telefone do destinatário"
          value={destinatarioTelefone}
          onChange={e => setDestinatarioTelefone(e.target.value)}
        />

        <label>Data de entrega *</label>
        <input
          type="date"
          value={dataEntrega}
          onChange={e => setDataEntrega(e.target.value)}
        />

        <label>Horário *</label>
        <select value={horaEntrega} onChange={e => setHoraEntrega(e.target.value)}>
          <option value="">Selecione</option>
          <option value="08:00">08:00</option>
          <option value="10:00">10:00</option>
          <option value="12:00">12:00</option>
          <option value="14:00">14:00</option>
          <option value="16:00">16:00</option>
          <option value="18:00">18:00</option>
        </select>

      </div>

      <button onClick={enviarDados} style={{ width: "100%", marginTop: 24 }}>
        🚀 Enviar Áudio Agendado
      </button>

    </div>
  );
};

export default AudioRecordPage;
