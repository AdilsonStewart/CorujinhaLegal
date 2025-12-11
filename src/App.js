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

// ✅ USE A NOVA TELA CLIENTES NO LUGAR DE SOUCLIENTE
import Clientes from './screens/Clientes';
import Retorno from './screens/Retorno';

function App() {
  return (
    <Router>
      <Routes>
        {/* 🏠 PÁGINA INICIAL */}
        <Route path="/" element={<Home />} />
        
        {/* 📝 FLUXO PRINCIPAL DE CRIAÇÃO */}
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/agendamento" element={<Agendamento />} />
        <Route path="/saida" element={<Saida />} />
        
        {/* 🎤 GRAVAÇÃO */}
        <Route path="/audiorecord" element={<AudioRecordPage />} />
        <Route path="/videorecord" element={<VideoRecordPage />} />
        
        {/* 👥 ÁREA DO CLIENTE */}
        {/* ✅ Botão "Sou Cliente" na Home vai para /soucliente */}
        <Route path="/soucliente" element={<Clientes />} />
        
        {/* 💰 RETORNO DO PAYPAL (CRÍTICO - NÃO MEXER) */}
        <Route path="/retorno" element={<Retorno />} />
        
        {/* 🔧 ADMIN */}
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* ❌ PÁGINA DE ERRO 404 */}
        <Route path="*" element={<Erro />} />
      </Routes>
    </Router>
  );
}

export default App;
