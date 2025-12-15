import React, { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
console.log("🔥 AUDIO RECORD PAGE — BUILD NOVO 🔥", Date.now());

// 🔧 CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

const AudioRecordPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const tempoIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setAudioURL(null);
      setAudioBlob(null);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
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
      alert("Não consegui acessar o microfone. Verifique as permissões.");
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

  // 🔹 FUNÇÃO PARA ENVIAR TODOS OS DADOS PARA SUPABASE (inclui remetente + garante data)
  const enviarDados = async () => {
    if (!audioBlob) { alert("Grave um áudio antes de enviar."); return; }
    if (!nome || !telefone || !horaEntrega) {
      alert("Preencha todos os campos: nome, telefone e horário.");
      return;
    }

    // telefone limpo
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) { alert("Digite um telefone válido com DDD (ex: 11999999999)."); return; }

    setIsUploading(true);

    try {
      // dados do remetente (se já estiverem no localStorage, usa; senão fica vazio)
      const remetenteNome = localStorage.getItem("clienteNome") || "";
      const remetenteTelefone = localStorage.getItem("clienteTelefone") || "";
      const remetenteNascimento = localStorage.getItem("clienteNascimento") || ""; // formato esperado: YYYY-MM-DD ou string

      // garante que dataEntrega seja preenchida: usa a data selecionada ou hoje (YYYY-MM-DD)
      const hojeIso = new Date().toISOString().slice(0, 10);
      const dataAgendamento = dataEntrega && dataEntrega.trim() ? dataEntrega : hojeIso;

      // 1️⃣ Nome do arquivo
      const nomeArquivo = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;

      // 2️⃣ Upload no Supabase
      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, { contentType: "audio/webm", cacheControl: "3600" });

      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message || JSON.stringify(uploadError)}`);

      // 3️⃣ URL pública (maneira robusta)
      let publicUrl = "";
      try {
        const res = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);
        publicUrl = (res && res.data && (res.data.publicUrl || res.data.publicURL)) || res?.publicURL || res?.publicUrl || "";
      } catch (e) {
        console.warn("Erro ao obter publicUrl:", e);
      }

      // 4️⃣ OrderID
      const orderID = localStorage.getItem("currentOrderId") || `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 5️⃣ Monta o objeto para salvar (adiciona campos do remetente explicitamente)
      const dadosParaSalvar = {
        data_agendamento: dataAgendamento, // GUARDA A DATA AQUI
        hora_agendamento: horaEntrega,
        criado_em: new Date().toISOString(),
        enviado: false,
        link_midia: publicUrl,
        // campos explícitos do remetente (top-level)
        remetente_nome: remetenteNome,
        remetente_telefone: remetenteTelefone,
        remetente_nascimento: remetenteNascimento,
        // conteúdo detalhado dentro do JSON existente
        dados_completos: {
          tipo: "audio",
          order_id: orderID,
          paypal_order_id: orderID,
          status: "pago",
          valor: 5.00,
          cliente_nome: nome,
          cliente_telefone: telefoneLimpo,
          remetente: remetenteNome || "Cliente",
          telefone_remetente: remetenteTelefone || "00000000000",
          remetente_nascimento: remetenteNascimento || "",
          destinatario: nome,
          telefone: telefoneLimpo,
          data_pagamento: new Date().toISOString()
        },
        evento_paypal: "FRONTEND_" + orderID,
        valor: 5.00
      };

      // 6️⃣ Inserir no Supabase (tabela agendamentos)
      const { data, error } = await supabase.from("agendamentos").insert([dadosParaSalvar]).select();
      if (error) throw new Error("Erro ao salvar no Supabase: " + (error.message || JSON.stringify(error)));

      // 7️⃣ Guardar no localStorage para Saida.js (inclui remetente)
      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome,
        telefone: telefoneLimpo,
        dataEntrega: dataAgendamento,
        horaEntrega,
        tipo: "audio",
        link_midia: publicUrl,
        orderID,
        remetenteNome,
        remetenteTelefone,
        remetenteNascimento
      }));

      alert(`🎉 Áudio agendado com sucesso!\n\n📞 Para: ${nome}\n📅 Data: ${dataAgendamento}\n🕒 Hora: ${horaEntrega}`);

      setTimeout(() => { window.location.href = "/saida"; }, 2000);

    } catch (err) {
      alert(`❌ Ocorreu um erro:\n${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>🎤 Gravador de Áudio - Máx 30s</h2>

      <div style={{ fontSize: 24, color: "#dc3545", fontWeight: "bold", background: "#ffebee", padding: "15px 25px", borderRadius: 25, textAlign: "center", marginBottom: 20 }}>
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button onClick={startRecording} style={{ fontSize: 22, padding: "18px 35px", background: "#007bff", color: "white", border: "none", borderRadius: 12, cursor: "pointer", width: "100%", marginBottom: 20 }}>
          🎙️ Iniciar Gravação (30s máx)
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

      {audioURL && (
        <div style={{ marginTop: 30 }}>
          <p><strong>✅ Áudio gravado (pronto para enviar):</strong></p>
          <audio controls src={audioURL} style={{ width: "100%", marginBottom: 20 }} />
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

      <button
        onClick={enviarDados}
        style={{
          marginTop: 30,
          padding: "18px 40px",
          fontSize: 20,
          background: (!audioBlob || isUploading) ? "#6c757d" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          width: "100%"
        }}
        title={!audioBlob ? "Grave um áudio antes de enviar." : (isUploading ? "Enviando..." : "Clique para enviar")}
      >
        {isUploading ? "📤 Enviando para Supabase..." : "🚀 Enviar Áudio Agendado"}
      </button>
    </div>
  );
};

export default AudioRecordPage;
