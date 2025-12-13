import React, { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

const VideoRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
    };
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
        setVideoBlob(blob);
        setVideoURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        clearInterval(tempoIntervalRef.current);
        setTempoRestante(30);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
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

    } catch (error) {
      alert("Não consegui acessar a câmera/microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(tempoIntervalRef.current);
      setTempoRestante(30);
    }
  };

  const enviarDados = async () => {
    if (!videoBlob) { alert("Grave um vídeo antes de enviar."); return; }
    if (!nome || !telefone || !dataEntrega || !horaEntrega) {
      alert("Preencha todos os campos: nome, telefone, data e horário.");
      return;
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) { alert("Digite um telefone válido com DDD (ex: 11999999999)."); return; }

    setIsUploading(true);

    try {
      // 1️⃣ Nome do arquivo
      const nomeArquivo = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;

      // 2️⃣ Upload no Supabase
      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, videoBlob, { contentType: "video/webm", cacheControl: "3600" });
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      // 3️⃣ URL pública
      const { data: { publicUrl } } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);

      // 4️⃣ OrderID do PayPal ou gerado
      const orderID = localStorage.getItem("currentOrderId") || `VIDEO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 5️⃣ Dados do remetente (cliente)
      const telefoneRemetente = localStorage.getItem("clienteTelefone") || "00000000000";

      // 6️⃣ Inserir no Supabase
      const dadosParaSalvar = {
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        criado_em: new Date().toISOString(),
        enviado: false,
        link_midia: publicUrl,
        dados_completos: {
          tipo: "video",
          order_id: orderID,
          paypal_order_id: orderID,
          status: "pago",
          valor: 10.00,
          cliente_nome: nome,
          cliente_telefone: telefoneLimpo,
          remetente: "Cliente",
          telefone_remetente: telefoneRemetente,
          destinatario: nome,
          telefone: telefoneLimpo,
          data_pagamento: new Date().toISOString()
        },
        evento_paypal: "FRONTEND_" + orderID,
        valor: 10.00
      };

      const { data, error } = await supabase.from("agendamentos").insert([dadosParaSalvar]).select();
      if (error) throw new Error("Erro ao salvar no Supabase: " + error.message);

      // 7️⃣ Guardar no localStorage para Saida.js
      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome,
        telefone: telefoneLimpo,
        dataEntrega,
        horaEntrega,
        tipo: "video",
        link_midia: publicUrl,
        orderID,
        remetenteTelefone: telefoneRemetente
      }));

      alert(`🎉 Vídeo agendado com sucesso!\n\n📞 Para: ${nome}\n📅 Data: ${dataEntrega}\n🕒 Hora: ${horaEntrega}`);

      setTimeout(() => { window.location.href = "/saida"; }, 2000);

    } catch (err) {
      alert(`❌ Ocorreu um erro:\n${err.message}`);
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>📹 Gravador de Vídeo - Máx 30s</h2>

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
        <div style={{ marginTop: 30 }}>
          <p><strong>✅ Vídeo gravado (pronto para enviar):</strong></p>
          <video controls src={videoURL} style={{ width: "100%", marginBottom: 20 }} />
        </div>
      )}

      <hr style={{ margin: "40px 0" }} />

      <div style={{ display: "grid", gap: 15 }}>
        <input type="text" placeholder="👤 Nome do destinatário *" value={nome} onChange={(e) => setNome(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
        <input type="tel" placeholder="📱 Telefone com DDD *" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }} />
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

      <button onClick={enviarDados} disabled={!videoBlob || isUploading} style={{ marginTop: 30, padding: "18px 40px", fontSize: 20, background: (!videoBlob || isUploading) ? "#6c757d" : "#28a745", color: "white", border: "none", borderRadius: 12, cursor: (!videoBlob || isUploading) ? "not-allowed" : "pointer", width: "100%" }}>
        {isUploading ? "📤 Enviando para Supabase..." : "🚀 Enviar Vídeo Agendado"}
      </button>
    </div>
  );
};

export default VideoRecordPage;
