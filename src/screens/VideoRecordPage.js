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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persistir remetente para prefill futuro (igual ao AudioRecordPage)
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
        // Compatibilidade com código legado
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

  // tenta encontrar cliente por telefone na coleção 'clientes' do Firestore
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

  // upsert cliente na coleção 'clientes' (retorna id) - mesma lógica do AudioRecordPage
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

  // função principal: upload no Supabase + gravação no Firestore (mesma estrutura do AudioRecordPage)
  const enviarDados = async () => {
    if (!videoBlob) { alert("Grave um vídeo antes de enviar."); return; }
    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega) {
      alert("Preencha destinatário, telefone e horário.");
      return;
    }
    if (!remetenteNascimento || !remetenteNascimento.trim()) {
      alert("Por favor, preencha a data de nascimento do remetente.");
      return;
    }

    setIsUploading(true);

    try {
      const hojeIso = new Date().toISOString().slice(0, 10);
      const dataAgendamento = dataEntrega && dataEntrega.trim() ? dataEntrega : hojeIso;

      // 1) Upsert cliente remetente no Firestore e obter cliente_id (opcional)
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

      // 3) getPublicUrl (robusto)
      let publicUrl = "";
      try {
        const res = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);
        publicUrl = (res && res.data && (res.data.publicUrl || res.data.publicURL)) || res?.publicURL || res?.publicUrl || "";
      } catch (e) {
        console.warn("Erro ao obter publicUrl:", e);
      }

      const orderID = localStorage.getItem("currentOrderId") || `VIDEO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const telefoneDestClean = sanitizePhone(destinatarioTelefone);
      const telefoneRemClean = sanitizePhone(remetenteTelefone || "");

      // 4) montar payload para Firestore (mesma estrutura do AudioRecordPage, ajustando tipo/valor)
      const payload = {
        orderID,
        link_midia: publicUrl,
        criado_em: serverTimestamp(),
        criado_em_iso: new Date().toISOString(),
        data_agendamento: dataAgendamento, // YYYY-MM-DD
        data_agendamento_ts: Timestamp.fromDate(new Date(dataAgendamento + "T00:00:00Z")),
        hora_agendamento: horaEntrega,
        enviado: false,
        tipo: "video",
        destinatario: {
          nome: destinatarioNome || "",
          telefone: telefoneDestClean || ""
        },
        remetente: {
          nome: remetenteNome || "",
          telefone: telefoneRemClean || "",
          nascimento: remetenteNascimento || ""
        },
        dados_completos: {
          tipo: "video",
          order_id: orderID,
          paypal_order_id: orderID,
          status: "pago",
          valor: 10.0,
          cliente_nome: destinatarioNome || "",
          cliente_telefone: telefoneDestClean || "",
          remetente: remetenteNome || "",
          telefone_remetente: telefoneRemClean || "",
          remetente_nascimento: remetenteNascimento || "",
          destinatario: destinatarioNome || "",
          telefone: telefoneDestClean || "",
          data_pagamento: new Date().toISOString()
        },
        evento_paypal: "FRONTEND_" + orderID,
        cliente_id: clienteId || null
      };

      // 5) gravar em Firestore (coleção 'agendamentos')
      const col = collection(db, "agendamentos");
      const docRef = await addDoc(col, payload);

      // 6) salvar localStorage para Saida.js / histórico (mesmos campos do AudioRecordPage)
      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome: destinatarioNome,
        telefone: telefoneDestClean,
        dataEntrega: dataAgendamento,
        horaEntrega,
        tipo: "video",
        link_midia: publicUrl,
        orderID,
        remetenteNome,
        remetenteTelefone: telefoneRemClean,
        remetenteNascimento,
        cliente_id: clienteId || null,
        firestore_doc_id: docRef.id
      }));

      alert(`🎉 Vídeo agendado com sucesso!\n\nPara: ${destinatarioNome}\nData: ${dataAgendamento}\nHora: ${horaEntrega}`);
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
        {/* Remetente */}
        <div style={{ fontWeight: "600" }}>Remetente (quem envia):</div>
        <input type="text" placeholder="Seu nome" value={remetenteNome} onChange={(e) => setRemetenteNome(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="tel" placeholder="Seu telefone com DDD" value={remetenteTelefone} onChange={(e) => setRemetenteTelefone(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <label style={{ fontSize: 14, color: "#333", fontWeight: 600, marginTop: 6 }}>Sua data de nascimento *</label>
        <input type="date" placeholder="Sua data de nascimento" aria-label="Sua data de nascimento" value={remetenteNascimento} onChange={(e) => setRemetenteNascimento(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />

        {/* Destinatário */}
        <div style={{ fontWeight: "600", marginTop: 8 }}>Entregar a mensagem para:</div>
        <input type="text" placeholder="Nome do destinatário *" value={destinatarioNome} onChange={(e) => setDestinatarioNome(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="tel" placeholder="Telefone do destinatário com DDD *" value={destinatarioTelefone} onChange={(e) => setDestinatarioTelefone(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />

        {/* Agendamento */}
        <div style={{ fontWeight: "600", marginTop: 8 }}>Data de entrega desta mensagem:</div>
        <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />

        <div style={{ fontWeight: "600", marginTop: 4 }}>Hora de entrega da mensagem:</div>
        <input type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
      </div>

      <button onClick={enviarDados} style={{ marginTop: 20, padding: "16px 28px", fontSize: 18, background: !videoBlob || isUploading ? "#6c757d" : "#28a745", color: "white", border: "none", borderRadius: 10, cursor: "pointer", width: "100%" }} title={!videoBlob ? "Grave um vídeo antes de enviar." : isUploading ? "Enviando..." : "Clique para enviar"}>
        {isUploading ? "📤 Enviando..." : "🚀 Enviar Vídeo Agendado"}
      </button>
    </div>
  );
};

export default VideoRecordPage;
