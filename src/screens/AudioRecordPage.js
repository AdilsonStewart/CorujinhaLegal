import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

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
  const [senha, setSenha] = useState("");
  const [modoSenha, setModoSenha] = useState("novo");

  const [remetenteNascimento, setRemetenteNascimento] = useState("");
  const [destinatarioNome, setDestinatarioNome] = useState("");
  const [destinatarioTelefone, setDestinatarioTelefone] = useState("");

  const [dataEntrega, setDataEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30);

  const [aceitoTermos, setAceitoTermos] = useState(false);

  const mediaRecorderRef = useRef(null);
  const tempoIntervalRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        const blob = new Blob([e.data], { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(tempoIntervalRef.current);
        setTempoRestante(30);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
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

    // 🟦 1) telefone do remetente obrigatório
    const telefoneRem = sanitizePhone(remetenteTelefone);

    if (!telefoneRem) {
      alert("Informe seu telefone para acessar sua conta.");
      return;
    }

    // 🟦 2) senha obrigatória
    if (!senha) {
      alert(modoSenha === "novo" ? "Crie uma senha." : "Digite sua senha.");
      return;
    }

    // 🟦 3) validar conta antes de qualquer outra coisa
    if (modoSenha === "existente") {
      try {
        const q = query(
          collection(db, "agendamentos"),
          where("telefone_remetente", "==", telefoneRem)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          alert("Nenhuma conta encontrada para este telefone. Crie uma senha.");
          return;
        }

        const dados = snap.docs[0].data();

        if (dados.senha !== senha) {
          alert("Senha incorreta.");
          return;
        }
      } catch {
        alert("Erro ao validar sua conta.");
        return;
      }
    }

    // 🟦 4) termos
    if (!aceitoTermos) return alert("Aceite os Termos para continuar.");

    // 🟦 5) áudio
    if (!audioBlob) return alert("Grave o áudio antes de enviar.");

    // 🟦 6) destinatário + horário
    if (!destinatarioNome || !destinatarioTelefone || !horaEntrega)
      return alert("Preencha destinatário, telefone e horário.");

    // 🟦 7) nascimento
    if (!remetenteNascimento)
      return alert("Informe sua data de nascimento.");

    // 🟦 8) envio normal
    setIsUploading(true);

    try {
      const nomeArquivo = `audio_${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("Midias")
        .upload(nomeArquivo, audioBlob, { contentType: "audio/webm" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("Midias").getPublicUrl(nomeArquivo);

      const orderID = `AUD-${Date.now()}`;

      const payload = {
        order_id: orderID,
        tipo: "audio",
        link_midia: data?.publicUrl || "",
        criado_em: new Date().toISOString(),
        data_agendamento: dataEntrega,
        hora_agendamento: horaEntrega,
        enviado: false,
        destinatario: destinatarioNome,
        telefone_destinatario: sanitizePhone(destinatarioTelefone),
        remetente: remetenteNome,
        telefone_remetente: telefoneRem,
        remetente_nascimento: remetenteNascimento,
        senha: senha
      };

      await addDoc(collection(db, "agendamentos"), payload);

      alert("🎉 Áudio agendado com sucesso!");

      localStorage.setItem(
        "lastAgendamento",
        JSON.stringify({
          nome: destinatarioNome,
          dataEntrega,
          horaEntrega,
          tipo: "audio",
          orderID,
          telefone: destinatarioTelefone
        })
      );

      window.location.href = "/saida";

    } catch {
      alert("Erro ao enviar.");
    }

    setIsUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "0 auto" }}>
      <h2>🎤 Gravador de Áudio - Máx 30s</h2>

      {/* ... UI permanece igual ... */}

      <div style={{ display: "grid", gap: 12 }}>
        <input type="text" placeholder="Seu nome (remetente)" value={remetenteNome} onChange={(e) => setRemetenteNome(e.target.value)} />
        <input type="tel" placeholder="Seu telefone (remetente)" value={remetenteTelefone} onChange={(e) => setRemetenteTelefone(e.target.value)} />

        <div style={{ display: "flex", gap: 10 }}>
          <label>
            <input
              type="radio"
              checked={modoSenha === "novo"}
              onChange={() => setModoSenha("novo")}
            />
            Primeiro acesso
          </label>

          <label>
            <input
              type="radio"
              checked={modoSenha === "existente"}
              onChange={() => setModoSenha("existente")}
            />
            Já tenho conta
          </label>
        </div>

        <input
          type="password"
          placeholder={modoSenha === "novo" ? "Crie uma senha" : "Digite sua senha"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      {/* restante permanece igual */}
      <button onClick={enviarDados}>🚀 Enviar Áudio Agendado</button>
    </div>
  );
};

export default AudioRecordPage;
