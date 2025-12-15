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
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const clientId = localStorage.getItem("clienteId");
        const clientTel = (localStorage.getItem("clienteTelefone") || "").replace(/\D/g, "");
        let q;

        if (clientId) {
          q = query(
            collection(db, "agendamentos"),
            where("cliente_id", "==", clientId),
            orderBy("data_agendamento_ts", "asc")
          );
        } else if (clientTel) {
          q = query(
            collection(db, "agendamentos"),
            where("destinatario.telefone", "==", clientTel),
            orderBy("data_agendamento_ts", "asc")
          );
        } else {
          setMensagensPendentes([]);
          setMensagensOutras([]);
          setLoading(false);
          return;
        }

        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filtrar pendentes: não canceladas e não enviadas
        const pendentes = items.filter(m => (m.status !== "cancelled" && m.status !== "cancelled_by_user") && !m.enviado);
        const outras = items.filter(m => !(pendentes.includes(m)));

        setMensagensPendentes(pendentes);
        setMensagensOutras(outras);
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
        setError("Erro ao carregar mensagens. Veja o console.");
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

      {!localStorage.getItem("clienteId") && !(localStorage.getItem("clienteTelefone")) && (
        <div style={{ marginBottom: 12, padding: 12, background: "#fff3cd", borderRadius: 8 }}>
          Não encontramos dados de cliente salvos. Volte à tela "Sou cliente" e identifique-se.
        </div>
      )}

      {loading && <div>Carregando suas mensagens...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

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
