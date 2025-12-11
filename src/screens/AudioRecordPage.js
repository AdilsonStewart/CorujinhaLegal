import React, { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURAÇÃO DO SUPABASE (FRONTEND - SEGURO)
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P'; // Chave pública - SEGURA
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
        if (tempoIntervalRef.current) {
          clearInterval(tempoIntervalRef.current);
        }
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
      if (tempoIntervalRef.current) {
        clearInterval(tempoIntervalRef.current);
      }
      setTempoRestante(30);
    }
  };

  const enviarDados = async () => {
    if (!audioBlob) {
      alert("Grave um áudio antes de enviar.");
      return;
    }

    // Validações básicas
    if (!nome || !telefone || !dataEntrega || !horaEntrega) {
      alert("Preencha todos os campos: nome, telefone, data e horário.");
      return;
    }

    // Validar telefone (mínimo 10 dígitos com DDD)
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      alert("Digite um telefone válido com DDD (ex: 11999999999).");
      return;
    }

    setIsUploading(true);

    try {
      console.log("📤 Iniciando upload para Supabase Storage...");
      
      // 1. Criar nome único para o arquivo
      const nomeArquivo = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
      
      // 2. Fazer upload para Supabase Storage (bucket 'Midias')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Midias')
        .upload(nomeArquivo, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error("❌ Erro no upload para Storage:", uploadError);
        throw new Error(`Falha no upload: ${uploadError.message}`);
      }

      console.log("✅ Upload para Storage concluído:", uploadData);

      // 3. Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('Midias')
        .getPublicUrl(nomeArquivo);

      console.log("🔗 URL pública gerada:", publicUrl);

      // 4. Preparar dados para o webhook
      const orderID = localStorage.getItem("currentOrderId") || `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const dadosParaWebhook = {
        tipo: 'audio',
        orderID: orderID,
        status: 'success', // Supondo pagamento já processado
        destinatario: nome,
        telefone: telefoneLimpo, // Telefone limpo (apenas números)
        data: dataEntrega,
        hora: horaEntrega,
        link_midia: publicUrl, // URL do áudio no Supabase Storage
        clienteId: localStorage.getItem("clienteId") || "sem-cadastro",
        valor: 5.00
      };

      console.log("📦 Dados para webhook:", dadosParaWebhook);

      // 5. Enviar dados para o webhook no Vercel
      const webhookResponse = await fetch('/api/paypal-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dadosParaWebhook)
      });

      // 6. Processar resposta do webhook
      let webhookResult;
      try {
        webhookResult = await webhookResponse.json();
      } catch (jsonError) {
        console.error("❌ Erro ao parsear JSON:", jsonError);
        throw new Error("Resposta inválida do servidor");
      }

      if (!webhookResponse.ok) {
        console.error("❌ Erro no webhook:", webhookResult);
        throw new Error(`Webhook falhou: ${webhookResult.error || 'Erro desconhecido'}`);
      }

      console.log("✅ Webhook respondeu com sucesso:", webhookResult);

      // 7. 🆕 SALVAR NO LOCALSTORAGE PARA SAIDA.JS
      const dadosParaSaida = {
        nome: nome,
        dataEntrega: dataEntrega,
        horario: horaEntrega,
        telefone: telefoneLimpo,
        tipo: 'audio',
        link_midia: publicUrl,
        orderID: orderID
      };

      localStorage.setItem('lastAgendamento', JSON.stringify(dadosParaSaida));
      console.log("📱 Dados salvos no localStorage para Saida.js:", dadosParaSaida);

      // 8. Sucesso completo!
      alert(`🎉 Áudio agendado com sucesso!\n\n📞 Para: ${nome}\n📅 Data: ${dataEntrega}\n🕒 Hora: ${horaEntrega}\n\nO SMS será enviado no dia e hora agendados.`);

      // 9. 🆕 REDIRECIONAR PARA SAIDA.JS APÓS 2 SEGUNDOS
      setTimeout(() => {
        window.location.href = '/saida';
      }, 2000);

      // 10. Limpar formulário (opcional, já vai redirecionar)
      setAudioURL(null);
      setAudioBlob(null);
      setNome("");
      setTelefone("");
      setDataEntrega("");
      setHoraEntrega("");

    } catch (error) {
      console.error("❌ Erro no processo completo:", error);
      alert(`❌ Ocorreu um erro:\n\n${error.message}\n\nTente novamente ou contate o suporte.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h2>🎤 Gravador de Áudio - Máx 30s</h2>
      
      <div style={{ 
        fontSize: "24px", 
        color: "#dc3545", 
        fontWeight: "bold",
        background: "#ffebee",
        padding: "15px 25px",
        borderRadius: "25px",
        textAlign: "center",
        marginBottom: "20px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
      }}>
        ⏱️ Tempo máximo: {tempoRestante}s
      </div>

      {!isRecording ? (
        <button 
          onClick={startRecording} 
          style={{ 
            fontSize: "22px", 
            padding: "18px 35px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            width: "100%",
            marginBottom: "20px"
          }}
        >
          🎙️ Iniciar Gravação (30s máx)
        </button>
      ) : (
        <div style={{ marginBottom: "20px" }}>
          <button 
            onClick={stopRecording} 
            style={{ 
              fontSize: "22px", 
              padding: "18px 35px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              width: "100%",
              marginBottom: "15px"
            }}
          >
            ⏹️ Parar Gravação ({tempoRestante}s)
          </button>
          <div style={{ 
            fontSize: "20px", 
            color: "#dc3545", 
            fontWeight: "bold",
            background: "#fff3cd",
            padding: "12px 20px",
            borderRadius: "20px",
            textAlign: "center"
          }}>
            ⏳ Gravando... {tempoRestante} segundos restantes
          </div>
        </div>
      )}

      {audioURL && (
        <div style={{ marginTop: 30 }}>
          <p><strong>✅ Áudio gravado (pronto para enviar):</strong></p>
          <audio controls src={audioURL} style={{ width: "100%", marginBottom: "20px" }} />
        </div>
      )}

      <hr style={{ margin: "40px 0" }} />

      <div style={{ display: "grid", gap: "15px" }}>
        <input
          type="text"
          placeholder="👤 Nome do destinatário *"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ padding: "12px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ddd" }}
          required
        />
        <input
          type="tel"
          placeholder="📱 Telefone com DDD (ex: 11999999999) *"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          style={{ padding: "12px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ddd" }}
          required
        />
        <input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
          style={{ padding: "12px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ddd" }}
          required
        />
        <select
          value={horaEntrega}
          onChange={(e) => setHoraEntrega(e.target.value)}
          style={{ padding: "12px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ddd" }}
          required
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
          fontSize: "20px",
          background: (!audioBlob || isUploading) ? "#6c757d" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "12px",
          cursor: (!audioBlob || isUploading) ? "not-allowed" : "pointer",
          width: "100%"
        }}
      >
        {isUploading ? "📤 Enviando para Supabase..." : "🚀 Enviar Áudio Agendado"}
      </button>

      {isUploading && (
        <div style={{
          marginTop: "15px",
          padding: "10px",
          background: "#e3f2fd",
          borderRadius: "8px",
          textAlign: "center",
          fontWeight: "bold"
        }}>
          ⏳ Enviando áudio e agendando... Não feche a página!
        </div>
      )}

      <div style={{
        marginTop: "20px",
        padding: "15px",
        background: "#f8f9fa",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#666"
      }}>
        <p><strong>ℹ️ Como funciona:</strong></p>
        <ol style={{ marginLeft: "20px" }}>
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
