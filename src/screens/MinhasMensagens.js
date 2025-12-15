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
  } catch (e) {
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
        const clientId = localStorage.getItem("clienteId");
        const clientTel = (localStorage.getItem("clienteTelefone") || "").replace(/\D/g, "");

        let docs = [];

        // Helper to dedupe by id
        const pushDocs = (arr) => {
          const map = new Map(docs.map(d => [d.id, d]));
          arr.forEach(a => map.set(a.id, a));
          docs = Array.from(map.values());
        };

        // 1) Try best query: cliente_id + orderBy (fast & ordered)
        if (clientId) {
          try {
            const q = query(
              collection(db, "agendamentos"),
              where("cliente_id", "==", clientId),
              orderBy("data_agendamento_ts", "asc")
            );
            const snap = await getDocs(q);
            pushDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch (err) {
            console.warn("Query cliente_id + orderBy falhou, tentando fallback:", err);
            // fallback: query without orderBy
            try {
              const q2 = query(collection(db, "agendamentos"), where("cliente_id", "==", clientId));
              const snap2 = await getDocs(q2);
              pushDocs(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err2) {
              console.error("Fallback por cliente_id também falhou:", err2);
              // continue to other fallbacks below
            }
          }
        }

        // 2) If still empty or also want wider search, try searching by destinatario.telefone
        if ((docs.length === 0) && clientTel) {
          try {
            const q3 = query(
              collection(db, "agendamentos"),
              where("destinatario.telefone", "==", clientTel),
              orderBy("data_agendamento_ts", "asc")
            );
            const snap3 = await getDocs(q3);
            pushDocs(snap3.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch (err) {
            console.warn("Query destinatario.telefone + orderBy falhou, tentando fallback:", err);
            try {
              const q4 = query(collection(db, "agendamentos"), where("destinatario.telefone", "==", clientTel));
              const snap4 = await getDocs(q4);
              pushDocs(snap4.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err4) {
              console.error("Fallback destinatario.telefone falhou:", err4);
            }
          }
        }

        // 3) Try searching by remetente.telefone as last fallback (some records may store telefones no remetente)
        if (docs.length === 0 && clientTel) {
          try {
            const q5 = query(collection(db, "agendamentos"), where("remetente.telefone", "==", clientTel));
            const snap5 = await getDocs(q5);
            pushDocs(snap5.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch (err5) {
            console.error("Busca por remetente.telefone falhou:", err5);
          }
        }

        // If still empty, there are genuinely no docs OR permission/index issues
        if (docs.length === 0) {
          // try a very broad no-filter small sample to detect permission issues (will fail if rules forbid)
          try {
            const qSample = query(collection(db, "agendamentos"), orderBy("criado_em_iso", "desc"));
            const snapS = await getDocs(qSample);
            // don't push these to docs as they may be lots of data; just use to check permission
            // but we won't use them as user's messages
            if (snapS.size === 0) {
              // no documents at all
            }
          } catch (errSample) {
            console.error("Erro acessando a coleção agendamentos — possível regra do Firestore ou index necessário:", errSample);
            setErrorMsg(`Erro ao carregar mensagens: ${errSample.message || String(errSample)}. Cole a primeira linha vermelha do console aqui para eu ajudar.`);
            setLoading(false);
            return;
          }
        }

        // Convert docs array to items
        const items = docs.map(d => ({ id: d.id, ...d }));

        // Normalize date fields and sort client-side by data_agendamento_ts (se disponível) ou criado_em_iso
        items.sort((a, b) => {
          const ta = (a.data_agendamento_ts && a.data_agendamento_ts.toDate) ? a.data_agendamento_ts.toDate().getTime() :
            (a.data_agendamento ? new Date(a.data_agendamento + "T00:00:00Z").getTime() : new Date(a.criado_em_iso || a.criado_em || 0).getTime());
          const tb = (b.data_agendamento_ts && b.data_agendamento_ts.toDate) ? b.data_agendamento_ts.toDate().getTime() :
            (b.data_agendamento ? new Date(b.data_agendamento + "T00:00:00Z").getTime() : new Date(b.criado_em_iso || b.criado_em || 0).getTime());
          return ta - tb;
        });

        // Filtrar pendentes: não canceladas e não enviadas
        const pendentes = items.filter(m => (m.status !== "cancelled" && m.status !== "cancelled_by_user") && !m.enviado);
        const outras = items.filter(m => !(pendentes.includes(m)));

        setMensagensPendentes(pendentes);
        setMensagensOutras(outras);
      } catch (err) {
        console.error("Erro ao carregar mensagens (catch geral):", err);
        setErrorMsg(`Erro ao carregar mensagens: ${err.message || String(err)}. Veja o console (F12).`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [refreshKey]);

  const handleCancelar = async (mensagem) => {
    if (!window.confirm(`Cancelar a mensagem para ${mensagem.destinatario?.nome || mensagem.destinatario?.telefone || "cliente"}?`)) return;
    try {
      const ref = doc(db, "agendamentos", mensagem.id);
      await updateDoc(ref, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: localStorage.getItem("clienteId") || "cliente-ui"
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Erro ao cancelar mensagem:", err);
      alert("Não foi possível cancelar a mensagem. Veja o console.");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto" }}>
      <h2>📬 Minhas Mensagens</h2>

      {errorMsg && (
        <div style={{ marginBottom: 12, padding: 12, background: "#fdecea", borderRadius: 8, color: "#842029" }}>
          {errorMsg}
        </div>
      )}

      {!localStorage.getItem("clienteId") && !(localStorage.getItem("clienteTelefono")) && (
        <div style={{ marginBottom: 12, padding: 12, background: "#fff3cd", borderRadius: 8 }}>
          Não encontramos dados de cliente salvos. Volte à tela "Sou cliente" e identifique-se.
        </div>
      )}

      {loading && <div>Carregando suas mensagens...</div>}

      <div style={{ marginTop: 12, padding: 12, background: "#f8f9fa", borderRadius: 8 }}>
        <strong>Mensagens pendentes para entrega:</strong> {mensagensPendentes.length}
      </div>

      {mensagensPendentes.length === 0 && !loading && (
        <div style={{ marginTop: 12, padding: 12, background: "#f1f1f1", borderRadius: 8 }}>
          Você não tem mensagens pendentes para entregar.
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {mensagensPendentes.map((m) => (
          <div key={m.id} style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{m.destinatario?.nome || "—"}</div>
                <div style={{ color: "#666", fontSize: 14 }}>
                  {formatDateBR(m.data_agendamento || m.criado_em_iso)} {m.hora_agendamento ? `• ${m.hora_agendamento}` : ""}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ marginBottom: 6 }}>
                  Status: <strong>{m.status || (m.enviado ? "sent" : "pending")}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>ID: {m.orderID || m.evento_paypal || m.id}</div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
              {m.link_midia ? (
                <a href={m.link_midia} target="_blank" rel="noopener noreferrer" style={{ color: "#0d6efd" }}>
                  Abrir mídia / link
                </a>
              ) : (
                <span style={{ color: "#999" }}>Sem link disponível</span>
              )}

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleCancelar(m)}
                  style={{ padding: "8px 10px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mensagensOutras.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Outras mensagens (enviadas / canceladas)</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {mensagensOutras.map((m) => (
              <div key={m.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fafafa" }}>
                <div style={{ fontWeight: 700 }}>{m.destinatario?.nome || "—"}</div>
                <div style={{ color: "#666", fontSize: 13 }}>{formatDateBR(m.data_agendamento || m.criado_em_iso)} {m.hora_agendamento ? `• ${m.hora_agendamento}` : ""} — Status: <strong>{m.status || (m.enviado ? "sent" : "pending")}</strong></div>
                <div style={{ marginTop: 8 }}>
                  {m.link_midia ? <a href={m.link_midia} target="_blank" rel="noreferrer" style={{ color: "#0d6efd" }}>Abrir mídia / link</a> : <span style={{ color: "#999" }}>Sem link</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <button onClick={() => navigate(-1)} style={{ padding: "10px 14px", marginRight: 8, borderRadius: 6 }}>Voltar</button>
        <button onClick={() => navigate('/servicos')} style={{ padding: "10px 14px", background: "#28a745", color: "#fff", border: "none", borderRadius: 6 }}>Enviar nova mensagem</button>
      </div>
    </div>
  );
}
