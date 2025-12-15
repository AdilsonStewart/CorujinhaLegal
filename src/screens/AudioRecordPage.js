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

  // 🔹 FUNÇÃO PARA ENVIAR TODOS OS DADOS PARA SUPABASE
  const enviarDados = async () => {
    if (!audioBlob) { alert("Grave um áudio antes de enviar."); return; }
    if (!nome || !telefone || !dataEntrega || !horaEntrega) {
      alert("Preencha todos os campos: nome, telefone, data e horário.");
      return;
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) { alert("Digite um telefone válido com DDD (ex: 11999999999)."); return; }

    setIsUploading(true);

    try {
      // 1️⃣ Nome do arquivo
      const nomeArquivo = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;

      // 2️⃣ Upload no Supabase
      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, { contentType: "audio/webm", cacheControl: "3600" });
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      // 3️⃣ URL pública
      const { data: { publicUrl } } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);

      // 4️⃣ OrderID do PayPal ou gerado
      const orderID = localStorage.getItem("currentOrderId") || `AUDIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
          tipo: "audio",
          order_id: orderID,
          paypal_order_id: orderID,
          status: "pago",
          valor: 5.00,
          cliente_nome: nome,
          cliente_telefone: telefoneLimpo,
          remetente: "Cliente",
          telefone_remetente: telefoneRemetente,
          destinatario: nome,
          telefone: telefoneLimpo,
          data_pagamento: new Date().toISOString()
        },
        evento_paypal: "FRONTEND_" + orderID,
        valor: 5.00
      };

      const { data, error } = await supabase.from("agendamentos").insert([dadosParaSalvar]).select();
      if (error) throw new Error("Erro ao salvar no Supabase: " + error.message);

      // 7️⃣ Guardar no localStorage para Saida.js
      localStorage.setItem("lastAgendamento", JSON.stringify({
        nome,
        telefone: telefoneLimpo,
        dataEntrega,
        horaEntrega,
        tipo: "audio",
        link_midia: publicUrl,
        orderID,
        remetenteTelefone: telefoneRemetente
      }));

      alert(`🎉 Áudio agendado com sucesso!\n\n📞 Para: ${nome}\n📅 Data: ${dataEntrega}\n🕒 Hora: ${horaEntrega}`);

      setTimeout(() => { window.location.href = "/saida"; }, 2000);

    } catch (err) {
      alert(`❌ Ocorreu um erro:\n${err.message}`);
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto"
