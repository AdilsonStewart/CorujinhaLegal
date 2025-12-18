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

// Supabase (mesma configuração do AudioRecordPage)
const supabaseUrl = "https://kuwsgvhjmjnhkteleczc.supabase.co";
const supabaseKey = "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P";
const supabase = createClient(supabaseUrl, supabaseKey);

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");
const formatDateBR = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const VideoRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);

  // Remetente (quem envia) - mesmos campos do AudioRecordPage
  const [remetenteNome, setRemetenteNome] = useState("");
  const [remetenteTelefone, setRemetenteTelefone] = useState("");
  const [remetenteNascimento, setRemetenteNascimento] = useState("");

  // Destinatário (quem recebe) - mesmos campos do AudioRecordPage
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");

  // Agendamento
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);

  useEffect(() => {
    // prefill remetente se existir no localStorage (igual ao AudioRecordPage)
    try {
      const rNome = localStorage.getItem("clienteNome") || "";
      const rTel = localStorage.getItem("clienteTelefone") || "";
      const rNasc = localStorage.getItem("clienteNascimento") || "";
      setRemetenteNome(rNome);
      setRemetenteTelefone(rTel);
      setRemetenteNascimento(rNasc);

      const last = JSON.parse(localStorage.getItem("lastAgendamento") || "null");
      if (last) {
        if (!destinatarioNome) setDestinatarioNome(last.nome || "");
        if (!destinatarioTelefone) setDestinatarioTelefone(last.telefone || "");
        if (!dataEntrega) setDataEntrega(last.dataEntrega || "");
        if (!horaEntrega) setHoraEntrega(last.horaEntrega || "");
      }
    } catch (e) {
      // ignore
    }

    return () => {
      if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
    };
  }, []);

  useEffect(() => { localStorage.setItem("clienteNome", remetenteNome || ""); }, [remetenteNome]);
  useEffect(() => { localStorage.setItem("clienteTelefone", remetenteTelefone || ""); }, [remetenteTelefone]);
  useEffect(() => { localStorage.setItem("clienteNascimento", remetenteNascimento || ""); }, [remetenteNascimento]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoChunksRef.current = [];
      setVideoURL(null);
      setVideoBlob(null);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => videoChunksRef.current.push(event.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoURL(url);
        try { window.lastRecordingUrl = url; } catch (e) {}
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
    } catch (error) {
      alert("Não consegui acessar a câmera e o microfone. Verifique as permissões.");
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

  // ... (continua etc.)
};

export default VideoRecordPage;
