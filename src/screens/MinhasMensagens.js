import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const formatDateBR = (isoDate) => {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    if (!isNaN(d)) return d.toLocaleDateString("pt-BR");
    const [y, m, day] = isoDate.slice(0, 10).split("-");
    return `${day}/${m}/${y}`;
  } catch {
    return isoDate;
  }
};

export default function MinhasMensagens() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mensagensPendentes, setMensagensPendentes] = useState([]);
  const [mensagensOutras, setMensagensOutras] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      setMensagensPendentes([]);
      setMensagensOutras([]);

      try {
        const clientTel = (localStorage.getItem("clienteTelefone") || "").replace(/\D/g, "");

        let docs = [];

        const pushDocs = (arr) => {
          const map = new Map(docs.map(d => [d.id, d]));
          arr.forEach(a => map.set(a.id, a));
          docs = Array.from(map.values());
        };

        if (clientTel) {
          try {
            const q = query(
              collection(db, "agendamentos"),
              where("telefone_remetente", "==", clientTel),
              orderBy("data_agendamento", "asc")
            );
            const snap = await getDocs(q);
            pushDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch {
            const q2 = query(
              collection(db, "agendamentos"),
              where("telefone_remetente", "==", clientTel)
            );
            const snap2 = await getDocs(q2);
            pushDocs(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        }

        if (docs.length === 0 && clientTel) {
          try {
            const q3 = query(
              collection(db, "agendamentos"),
              where("telefone", "==", clientTel),
              orderBy("data_agendamento", "asc")
            );
            const snap3 = await getDocs(q3);
            pushDocs(snap3.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch {
            const q4 = query(
              collection(db, "agendamentos"),
              where("telefone", "==", clientTel)
            );
            const snap4 = await getDocs(q4);
            pushDocs(snap4.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        }

        const items = docs.map(d => ({ id: d.id, ...d })); // docs já contém { id, ...d.data() }

        items.sort((a, b) => {
          const ta = a.data_agendamento
            ? new Date(a.data_agendamento + "T00:00:00Z").getTime()
            : new Date(a.criado_em || 0).getTime();
          const tb = b.data_agendamento
            ? new Date(b.data_agendamento + "T00:00:00Z").getTime()
            : new Date(b.criado_em || 0).getTime();
          return ta - tb;
        });

        const pendentes = items.filter(m => !m.enviado && m.status !== "cancelled");
        const outras = items.filter(m => !pendentes.includes(m));

        setMensagensPendentes(pendentes);
        setMensagensOutras(outras);
      } catch (err) {
        setErrorMsg("Erro ao carregar mensagens.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [refreshKey]);

  const handleCancelar = async (mensagem) => {
    if (!window.confirm(`Cancelar esta mensagem?`)) return;
    try {
      await updateDoc(doc(db, "agendamentos", mensagem.id), {
        status: "cancelled",
        cancelledAt: serverTimestamp()
      });
      setRefreshKey(k => k + 1);
    } catch {
      alert("Erro ao cancelar.");
    }
  };

  const handleExcluir = async (mensagem) => {
    if (!window.confirm(`Excluir PERMANENTEMENTE esta mensagem?`)) return;
    try {
      await deleteDoc(doc(db, "agendamentos", mensagem.id));
      setRefreshKey(k => k + 1);
    } catch {
      alert("Erro ao excluir.");
    }
  };

  const textoStatus = (m) => {
    if (m.status === "cancelled") return "cancelada";
    if (m.enviado) return "enviada";
    return "aguardando";
  };

  const textoTipo = (m) => {
    if (m.tipo === "audio") return "🎙️ áudio";
    if (m.tipo === "video") return "🎥 vídeo";
    return "mensagem";
  };

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto" }}>
      <h2>📬 Minhas Mensagens</h2>

      {errorMsg && <div style={{ color: "red" }}>{errorMsg}</div>}
      {loading && <div>Carregando...</div>}

      <div style={{ marginTop: 12 }}>
        <strong>Pendentes:</strong> {mensagensPendentes.length}
      </div>

      {mensagensPendentes.map((m) => (
        <div key={m.id} style={{ border: "1px solid #ccc", padding: 12, marginTop: 8 }}>
          <div><b>Para:</b> {m.destinatario}</div>
          <div><b>Tipo:</b> {textoTipo(m)}</div>
          <div><b>Data:</b> {formatDateBR(m.data_agendamento)}</div>
          <div><b>Status:</b> {textoStatus(m)}</div>

          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button onClick={() => handleCancelar(m)}>Cancelar</button>
            <button onClick={() => handleExcluir(m)} style={{ background: "red", color: "#fff" }}>
              Excluir
            </button>
          </div>
        </div>
      ))}

      {mensagensOutras.length > 0 && (
        <>
          <h3>Outras mensagens</h3>
          {mensagensOutras.map((m) => (
            <div key={m.id} style={{ border: "1px solid #eee", padding: 10, marginTop: 8 }}>
              <div><b>{m.destinatario}</b> — {textoTipo(m)}</div>
              <div>{formatDateBR(m.data_agendamento)} — {textoStatus(m)}</div>
            </div>
          ))}
        </>
      )}

      <button onClick={() => navigate(-1)} style={{ marginTop: 20 }}>
        Voltar
      </button>
    </div>
  );
}
