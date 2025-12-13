import React, { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { db } from "../firebase/config";
import { collection, addDoc } from "firebase/firestore";

// 🔧 CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

const AudioRecorder = () => {
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
        stream.getTracks().forEach((track) => track.stop());
        if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
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
      if (tempoIntervalRef.current) clearInterval(tempoIntervalRef.current);
      setTempoRestante(30);
    }
  };

  const enviarDados = async () => {
    if (!audioBlob) return alert("Grave um áudio antes de enviar.");
    if (!nome || !telefone || !dataEntrega || !horaEntrega)
      return alert("Preencha todos os campos: nome, telefone, data e horário.");

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10)
      return alert("Digite um telefone válido com DDD (ex: 11999999999).");

    setIsUploading(true);

    try {
      // 1. Upload do áudio no Supabase
      const nomeArquivo = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, { contentType: "audio/webm", cacheControl: "3600" });
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);

      // 2. Gerar OrderID
      const orderID = localStorage.getItem("currentOrderId") ||
        `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 3. Dados do remetente
      const remetenteTelefone = localStorage.getItem("clienteTelefone") || "00000000000";

      // 4. Salvar no Supabase (completo)
      await supabase.from("agendamentos").insert([{
        tipo: "audio",
        order_id: orderID,
        link_midia: publicUrl,
        destinatario: nome,
        telefone: telefoneLimpo,
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega + ":00",
        Remetente: remetenteTelefone,
        criado_em: new Date().toISOString(),
        enviado: false,
        valor: 5.00
      }]);

      // 5. Salvar no Firestore (cliente → agendamentos)
      const clienteId = localStorage.getItem("clienteId");
      if (clienteId) {
        await addDoc(
          collection(db, "clientes", clienteId, "agendamentos"),
          {
            tipo: "audio",
            orderID,
            link_midia: publicUrl,
            destinatario: nome,
            telefone: telefoneLimpo,
            dataEntrega,
            horaEntrega,
            remetenteTelefone,
            criadoEm: new Date().toISOString()
          }
        );
      }

      // 6. Salvar apenas os dados necessários no localStorage para a Saida.js
      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome,
        dataEntrega,
        horario: horaEntrega,
        telefone: telefoneLimpo,
        tipo: "audio",
        link_midia: publicUrl,
        orderID,
        remetenteTelefone
      }));

      alert(`🎉 Áudio agendado com sucesso!\n\n📞 Para: ${nome}\n📅 Data: ${dataEntrega}\n🕒 Hora: ${horaEntrega}`);
      setTimeout(() => window.location.href = "/saida", 1500);

    } catch (error) {
      alert(`❌ Ocorreu um erro:\n\n${error.message}`);
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>🎤 Gravador de Áudio - Máx 30s</h2>

      <div
        style={{
          fontSize: 24,
          color: "#dc3545",
          fontWeight: "bold",
          background: "#ffebee",
          padding: "15px 25px",
          borderRadius: 25,
          textAlign: "center",
          marginBottom: 20
        }}
      >
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button
          onClick={startRecording}
          style={{
            fontSize: 22,
            padding: "18px 35px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            width: "100%",
            marginBottom: 20
          }}
        >
          🎙️ Iniciar Gravação (30s máx)
        </button>
      ) : (
        <div>
          <button
            onClick={stopRecording}
            style={{
              fontSize: 22,
              padding: "18px 35px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              width: "100%",
              marginBottom: 15
            }}
          >
            ⏹️ Parar Gravação ({tempoRestante}s)
          </button>

          <div
            style={{
              fontSize: 20,
              color: "#dc3545",
              fontWeight: "bold",
              background: "#fff3cd",
              padding: "12px 20px",
              borderRadius: 20,
              textAlign: "center"
            }}
          >
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
        <input
          type="text"
          placeholder="👤 Nome do destinatário *"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="tel"
          placeholder="📱 Telefone com DDD (ex: 11999999999) *"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <select
          value={horaEntrega}
          onChange={(e) => setHoraEntrega(e.target.value)}
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ddd" }}
        >
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
        disabled={!audioBlob || isUploading}
        style={{
          marginTop: 30,
          padding: "18px 40px",
          fontSize: 20,
          background: (!audioBlob || isUploading) ? "#6c757d" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: 12,
          cursor: (!audioBlob || isUploading) ? "not-allowed" : "pointer",
          width: "100%"
        }}
      >
        {isUploading ? "📤 Enviando e agendando..." : "🚀 Enviar Áudio Agendado"}
      </button>
    </div>
  );
};

export default AudioRecorder;
