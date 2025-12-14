import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./GravarAudio.css";


// 🔧 SUPABASE (MESMAS CHAVES DO APP)
const supabaseUrl = "https://kuwsgvhjmjnhkteleczc.supabase.co";
const supabaseKey = "sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P";
const supabase = createClient(supabaseUrl, supabaseKey);


const GravarAudio = () => {
// 🔹 DADOS DO CLIENTE / AGENDAMENTO
const [nome, setNome] = useState("");
const [telefone, setTelefone] = useState("");
const [dataEntrega, setDataEntrega] = useState("");
const [horaEntrega, setHoraEntrega] = useState("");


// 🔹 GRAVAÇÃO
const [gravando, setGravando] = useState(false);
const [audioBlob, setAudioBlob] = useState(null);
const [audioURL, setAudioURL] = useState(null);
const [enviando, setEnviando] = useState(false);


const mediaRecorderRef = useRef(null);
const chunksRef = useRef([]);


// 🔹 CARREGAR DADOS DO LOCALSTORAGE (SE EXISTIREM)
useEffect(() => {
setNome(localStorage.getItem("clienteNome") || "");
setTelefone(localStorage.getItem("clienteTelefone") || "");
setDataEntrega(localStorage.getItem("dataEntrega") || "");
setHoraEntrega(localStorage.getItem("horaEntrega") || "");
}, []);


// 🎙️ INICIAR GRAVAÇÃO
const iniciar = async () => {
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
chunksRef.current = [];


const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
mediaRecorder.onstop = () => {
const blob = new Blob(chunksRef.current, { type: "audio/webm" });
setAudioBlob(blob);
setAudioURL(URL.createObjectURL(blob));
stream.getTracks().forEach((t) => t.stop());
};


mediaRecorder.start();
mediaRecorderRef.current = mediaRecorder;
setGravando(true);
} catch (err) {
alert("❌ Não foi possível acessar o microfone");
}
};


// ⏹️ PARAR GRAVAÇÃO
const parar = () => {
if (mediaRecorderRef.current) {
mediaRecorderRef.current.stop();
setGravando(false);
}
};


// 🚀 ENVIAR TUDO (ÁUDIO + DADOS COMPLETOS)
const enviar = async () => {
if (!audioBlob) return alert("Grave o áudio primeiro");
if (!nome || !telefone || !dataEntrega || !horaEntrega) {
return alert("Preencha TODOS os dados antes de enviar");
}


setEnviando(true);


try {
const telefoneLimpo = telefone.replace(/\D/g, "");
const orderID = localStorage.getItem("currentOrderId") || `AUDIO-${Date.now()}`;
};
