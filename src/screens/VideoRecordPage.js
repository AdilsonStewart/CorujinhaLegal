import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { db } from "../firebase/config";
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

// Supabase (mantive local como antes)
const supabaseUrl = "https://kuwsgvhjmjnhkteleczc.supabase.co";
const supabaseKey = "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P";
const supabase = createClient(supabaseUrl, supabaseKey);

const sanitizePhone = (s = "") => (s || "").toString().replace(/\D/g, "");
const formatDateBR = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const fetchClientByPhone = async (phone) => {
  try {
    const tel = sanitizePhone(phone);
    if (!tel) return null;
    const q = query(collection(db, "clientes"), where("telefone", "==", tel));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    }
    return null;
  } catch (e) {
    console.warn("fetchClientByPhone error:", e);
    return null;
  }
};

const upsertClientFirestore = async ({ nome, telefone, dataNascimento, email, cpfCnpj }) => {
  try {
    const tel = sanitizePhone(telefone || "");
    if (!tel) {
      const payload = { nome: nome || null, dataNascimento: dataNascimento || null, email: email || null, cpfCnpj: cpfCnpj || null, criadoEm: serverTimestamp() };
      const ref = await addDoc(collection(db, "clientes"), payload);
      return ref.id;
    }

    const existing = await fetchClientByPhone(tel);
    if (existing) {
      const ref = doc(db, "clientes", existing.id);
      await setDoc(ref, {
        nome: nome || existing.nome || null,
        telefone: tel,
        dataNascimento: dataNascimento || existing.dataNascimento || null,
        email: email || existing.email || null,
        cpfCnpj: cpfCnpj || existing.cpfCnpj || null,
        atualizadoEm: serverTimestamp()
      }, { merge: true });
      return existing.id;
    } else {
      const payload = {
        nome: nome || null,
        telefone: tel,
        dataNascimento: dataNascimento || null,
        email: email || null,
        cpfCnpj: cpfCnpj || null,
        criadoEm: serverTimestamp()
      };
      const ref = await addDoc(collection(db, "clientes"), payload);
      return ref.id;
    }
  } catch (e) {
    console.warn("upsertClientFirestore error:", e);
    return null;
  }
};

const VideoRecorder = () => {
  // gravação
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);
  const [tempoRestante, setTempoRestante] = useState(30);

  // destinatário (igual ao AudioRecordPage)
  const [destNome, setDestNome] = useState("");
  const [destTelefone, setDestTelefone] = useState("");

  // remetente (prefill a partir do localStorage, editável)
  const [remetenteNome, setRemetenteNome] = useState(localStorage.getItem("clienteNome") || "");
  const [remetenteTelefone, setRemetenteTelefone] = useState(localStorage.getItem("clienteTelefone") || "");
  const [remetenteNascimento, setRemetenteNascimento] = useState(localStorage.getItem("clienteNascimento") || "");

  // agendamento
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    console.log("VideoRecorder montado");
    return () => {
      if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        console.log("video blob criado, tamanho:", blob.size, "url:", url);
        setVideoBlob(blob);
        setVideoURL(url);
        // compatibilidade com código antigo que pode referenciar lastRecordingUrl
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
      console.error("startRecording error:", error);
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

  const enviarDados = async () => {
    if (!videoBlob) { alert("Grave um vídeo antes de enviar."); return; }
    if (!destNome || !destTelefone || !horaEntrega) {
      alert("Preencha destinatário, telefone e horário.");
      return;
    }
    if (!remetenteNascimento || !remetenteNascimento.trim()) {
      // manter mesma validação do AudioRecordPage
      alert("Por favor, preencha a data de nascimento do remetente.");
      return;
    }

    const telefoneLimpo = sanitizePhone(destTelefone);
    if (telefoneLimpo.length < 10) return alert("Digite um telefone válido com DDD (ex: 11999999999).");

    setIsUploading(true);

    try {
      const hojeIso = new Date().toISOString().slice(0, 10);
      const dataAgendamento = dataEntrega && dataEntrega.trim() ? dataEntrega : hojeIso;

      // 1) Upsert cliente (remetente) - reutiliza função
      const clienteId = await upsertClientFirestore({
        nome: remetenteNome,
        telefone: remetenteTelefone,
        dataNascimento: remetenteNascimento
      });

      // 2) Upload no Supabase
      const nomeArquivo = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
      const { error: uploadError } = await supabase.storage.from("Midias").upload(
        nomeArquivo,
        videoBlob,
        { contentType: "video/webm", cacheControl: "3600" }
      );
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message || JSON.stringify(uploadError)}`);

      // 3) obter publicUrl de forma robusta
      let publicUrl = "";
      try {
        const res = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);
        publicUrl = (res && res.data && (res.data.publicUrl || res.data.publicURL)) || res?.publicURL || res?.publicUrl || "";
      } catch (e) {
        console.warn("Erro ao obter publicUrl:", e);
      }

      // 4) montar payload igual ao AudioRecordPage
      const orderID = localStorage.getItem("currentOrderId") || `VIDEO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const payload = {
        orderID,
        link_midia: publicUrl,
        criado_em: serverTimestamp(),
        criado_em_iso: new Date().toISOString(),
        data_agendamento: dataAgendamento,
        data_agendamento_ts: Timestamp.fromDate(new Date(dataAgendamento + "T00:00:00Z")),
        hora_agendamento: horaEntrega,
        enviado: false,
        tipo: "video",
        destinatario: { nome: destNome || "", telefone: telefoneLimpo || "" },
        remetente: { nome: remetenteNome || "", telefone: remetenteTelefone || "", nascimento: remetenteNascimento || "" },
        dados_completos: {
          tipo: "video",
          order_id: orderID,
          status: "pago",
          valor: 10.0,
          cliente_nome: destNome || "",
          cliente_telefone: telefoneLimpo || "",
          remetente: remetenteNome || "",
          telefone_remetente: remetenteTelefone || "",
          remetente_nascimento: remetenteNascimento || "",
          destinatario: destNome || "",
          telefone: telefoneLimpo || "",
          data_pagamento: new Date().toISOString()
        },
        evento_paypal: "FRONTEND_" + orderID,
        cliente_id: clienteId || null
      };

      // 5) gravar em Firestore (coleção 'agendamentos')
      const col = collection(db, "agendamentos");
      const docRef = await addDoc(col, payload);

      // 6) salvar localStorage para Saida.js (mesmos campos do AudioRecordPage)
      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome: destNome,
        telefone: telefoneLimpo,
        dataEntrega: dataAgendamento,
        horaEntrega,
        tipo: "video",
        link_midia: publicUrl,
        orderID,
        remetenteNome,
        remetenteTelefone,
        remetenteNascimento,
        cliente_id: clienteId || null,
        firestore_doc_id: docRef.id
      }));

      alert(`🎉 Vídeo agendado com sucesso!\n\n📞 Para: ${destNome}\n📅 Data: ${formatDateBR(dataAgendamento)}\n🕒 Hora: ${horaEntrega}`);
      setTimeout(() => { window.location.href = "/saida"; }, 1200);

    } catch (err) {
      console.error("Erro enviarDados (video):", err);
      alert(`❌ Ocorreu um erro:\n${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎥 Gravador de Vídeo - Máx 30s</h2>

      <div style={{ fontSize: 24, color: "#dc3545", fontWeight: "bold", background: "#ffebee", padding: "15px 25px", borderRadius: 25, textAlign: "center", marginBottom: 20 }}>
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button onClick={startRecording} style={{ fontSize: 22, padding: "18px 35px", background: "#007bff", color: "white", border: "none", borderRadius: 12, cursor: "pointer", width: "100%", marginBottom: 20 }}>
          🎬 Iniciar Gravação (30s máx)
        </button>
      ) : (
        <div>
          <button onClick={stopRecording} style={{ fontSize: 22, padding: "18px 35px", background: "#dc3545", color: "white", border: "none", borderRadius: 12, cursor: "pointer", width: "100%", marginBottom: 15 }}>
            ⏹️ Parar Gravação ({tempoRestante}s)
          </button>

          <div style={{ fontSize: 20, color: "#dc3545", fontWeight: "bold", background: "#fff3cd", padding: "12px 20px", borderRadius: 20, textAlign: "center" }}>
            ⏳ Gravando... {tempoRestante}s restantes
          </div>
        </div>
      )}

      {videoURL && (
        <div style={{ marginTop: 20 }}>
          <p><strong>✅ Vídeo gravado (pronto para enviar):</strong></p>
          <video controls src={videoURL} style={{ width: "100%", marginBottom: 16 }} />
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      <div style={{ display: "grid", gap: 10 }}>
        <input type="text" placeholder="Nome do destinatário *" value={destNome} onChange={(e) => setDestNome(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="tel" placeholder="Telefone com DDD *" value={destTelefone} onChange={(e) => setDestTelefone(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
          <select value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}>
            <option value="">🕒 Escolha o horário *</option>
            <option value="09:00">09:00</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
            <option value="16:00">16:00</option>
            <option value="17:00">17:00</option>
          </select>
        </div>

        <hr style={{ margin: "6px 0" }} />

        <p style={{ margin: 0, fontWeight: "600" }}>Remetente (sua identidade — preenchido automaticamente)</p>
        <input type="text" placeholder="Seu nome" value={remetenteNome} onChange={(e) => { setRemetenteNome(e.target.value); localStorage.setItem("clienteNome", e.target.value); }} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="tel" placeholder="Seu telefone (DDD)" value={remetenteTelefone} onChange={(e) => { setRemetenteTelefone(e.target.value); localStorage.setItem("clienteTelefone", e.target.value); }} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="date" placeholder="Seu nascimento" value={remetenteNascimento} onChange={(e) => { setRemetenteNascimento(e.target.value); localStorage.setItem("clienteNascimento", e.target.value); }} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
      </div>

      <button onClick={enviarDados} disabled={!videoBlob || isUploading} style={{ marginTop: 20, padding: "16px 28px", fontSize: 18, background: !videoBlob || isUploading ? "#6c757d" : "#28a745", color: "white", border: "none", borderRadius: 10, cursor: !videoBlob || isUploading ? "not-allowed" : "pointer", width: "100%" }} title={!videoBlob ? "Grave um vídeo antes de enviar." : isUploading ? "Enviando..." : "Clique para enviar"}>
        {isUploading ? "📤 Enviando..." : "🚀 Enviar Vídeo Agendado"}
      </button>
    </div>
  );
};

export default VideoRecorder;
