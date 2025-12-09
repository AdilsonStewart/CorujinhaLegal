import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from './screens/Home';
import Cadastro from './screens/Cadastro';
import Servicos from './screens/Servicos';
import Erro from './screens/Erro';
import AudioRecordPage from './screens/AudioRecordPage';
import Agendamento from './screens/Agendamento';
import Saida from './screens/Saida';
import VideoRecordPage from './screens/VideoRecordPage';
import AdminDashboard from './screens/AdminDashboard';

import SouCliente from './screens/SouCliente';
import Retorno from './screens/Retorno'; // 🔥 ADICIONADO AQUI

function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/agendamento" element={<Agendamento />} />
        <Route path="/saida" element={<Saida />} />
        <Route path="/audiorecord" element={<AudioRecordPage />} />
        <Route path="/videorecord" element={<VideoRecordPage />} />
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/soucliente" element={<SouCliente />} />

        {/* ⭐ ROTA DE RETORNO DO PAYPAL */}
        <Route path="/retorno" element={<Retorno />} />

        {/* ROTA 404 */}
        <Route path="*" element={<Erro />} />

      </Routes>
    </Router>
  );
}

export default App;
