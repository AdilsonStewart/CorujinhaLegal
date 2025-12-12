import React, { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

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
      if (tempoIntervalRef.current) {
        clearInterval(tempoIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioChunksRef.current = [];
      setAudioURL(null);
      setAudioBlob(null);

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

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
        setTempoRestante((prev) => {
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

  // 🆕 ATUALIZA DADOS COMPLETOS NO SUPABASE
  const atualizarDadosCompletosNoSupabase = async (orderID, nomeDestinatario, telefoneDestinatario, data, hora) => {
    try {
      const telefoneDestinatarioLimpo = telefoneDestinatario.replace(/\D/g, '');
      const telefoneRemetente = localStorage.getItem("clienteTelefone");
      const telefoneRemetenteLimpo = telefoneRemetente ? telefoneRemetente.replace(/\D/g, '') : "00000000000";

      const dadosAtualizacao = {
        destinatario: nomeDestinatario,
        telefone: telefoneDestinatarioLimpo,
        data_agendamento: data,
        hora_agendamento: hora,
        Remetente: telefoneRemetenteLimpo,
        atualizado_em: new Date().toISOString()
      };

      const { data: registroExistente } = await supabase
        .from('agendamentos')
        .select('id, order_id')
        .eq('order_id', orderID)
        .maybeSingle();

      if (!registroExistente) return false;

      const { error } = await supabase
        .from('agendamentos')
        .update(dadosAtualizacao)
        .eq('order_id', orderID);

      return !error;

    } catch (error) {
      console.error("Erro na atualização:", error);
      return false;
    }
  };

  const enviarDados = async () => {
    if (!audioBlob) {
      alert("Grave um áudio antes de enviar.");
      return;
    }

    if (!nome || !telefone || !dataEntrega || !horaEntrega) {
      alert("Preencha todos os campos: nome, telefone, data e horário.");
      return;
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      alert("Digite um telefone válido com DDD (ex: 11999999999).");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Nome do arquivo CORRIGIDO
      const nomeArquivo = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;

      // 2. Upload
      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, {
          contentType: "audio/webm",
          cacheControl: "3600"
        });

      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      // 3. URL pública
      const { data: { publicUrl } } = supabase
        .storage
        .from("Midias")
        .getPublicUrl(nomeArquivo);

      // 4. OrderID
      const orderID =
        localStorage.getItem("currentOrderId") ||
        `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const dadosParaWebhook = {
        tipo: "audio",
        orderID,
        status: "success"
      };

      // 5. Webhook
      const webhookResponse = await fetch("/api/paypal-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaWebhook)
      });

      const webhookResult = await webhookResponse.json();
      if (!webhookResponse.ok) throw new Error(webhookResult.error);

      // 6. Atualizar dados completos
      await atualizarDadosCompletosNoSupabase(orderID, nome, telefone, dataEntrega, horaEntrega);

      // 7. Salvar para Saida.js
      const dadosParaSaida = {
        nome,
        dataEntrega,
        horario: horaEntrega,
        telefone: telefoneLimpo,
        tipo: "audio",
        link_midia: publicUrl,
        orderID,
        remetenteTelefone: localStorage.getItem("clienteTelefone") || "Não informado"
      };

      localStorage.setItem("lastAgendamento", JSON.stringify(dadosParaSaida));

      // 8. Mensagem corrigida
      alert(
        `🎉 Áudio agendado com sucesso!\n\n📞 Para: ${nome}\n📅 Data: ${dataEntrega}\n🕒 Hora: ${horaEntrega}`
      );

      // 9. Redirecionar
      setTimeout(() => {
        window.location.href = "/saida";
      }, 2000);

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
        {isUploading ? "📤 Enviando para Supabase..." : "🚀 Enviar Áudio Agendado"}
      </button>

      {isUploading && (
        <div
          style={{
            marginTop: 15,
            padding: 10,
            background: "#e3f2fd",
            borderRadius: 8,
            textAlign: "center",
            fontWeight: "bold"
          }}
        >
          ⏳ Enviando áudio e agendando... Não feche a página!
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          padding: 15,
          background: "#f8f9fa",
          borderRadius: 8,
          fontSize: 14,
          color: "#666"
        }}
      >
        <p><strong>ℹ️ Como funciona:</strong></p>
        <ol style={{ marginLeft: 20 }}>
          <li>Seu áudio é enviado para o Supabase Storage</li>
          <li>Os dados são salvos no banco de dados</li>
          <li>No dia e hora agendados, um SMS será enviado automaticamente</li>
          <li>O destinatário recebe um link para ouvir sua mensagem</li>
        </ol>
      </div>
    </div>
  );
};

export default AudioRecorder;
