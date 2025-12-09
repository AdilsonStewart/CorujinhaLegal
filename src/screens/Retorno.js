import { useEffect } from "react";

const Retorno = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // ✅ CORRIGIDO: pega o parâmetro "tipo" correto
    const tipo = params.get("tipo");
    const status = params.get("status");
    const orderID = params.get("orderID");

    console.log("Parâmetros recebidos:", { tipo, status, orderID });

    if (status === "success") {
      if (tipo === "audio") {
        window.location.href = "/audiorecord";
      } else if (tipo === "video") {
        window.location.href = "/videorecord";
      } else {
        window.location.href = "/";
      }
    } else {
      window.location.href = "/";
    }
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h2>Processando retorno do pagamento...</h2>
      <p>Aguarde, estamos redirecionando você.</p>
    </div>
  );
};

export default Retorno;
