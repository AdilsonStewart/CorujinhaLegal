import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 🏠 Telas principais
import Home from './screens/Home';
import Cadastro from './screens/Cadastro';
import Servicos from './screens/Servicos';
import Agendamento from './screens/Agendamento';
import Saida from './screens/Saida';
import Erro from './screens/Erro';
import GravarAudio from './screens/GravarAudio';

// 🎤 Gravações
import AudioRecordPage from './screens/AudioRecordPage';
import VideoRecordPage from './screens/VideoRecordPage';
import LivreRecordPage from './screens/LivreRecordPage'; // ainda a implementar

// 👥 Área do cliente
import Clientes from './screens/Clientes';
import ClientIdentifyPage from './screens/ClientIdentifyPage'; // nova tela "Sou cliente"
import MinhasMensagens from './screens/MinhasMensagens'; // nova lista do cliente

// 💰 Retorno PayPal (não mexer)
import Retorno from './screens/Retorno';

// 🔧 Admin
import AdminDashboard from './screens/AdminDashboard';

// 🔹 Nova tela do Orfeu
import OrfeuIntro from './screens/OrfeuIntro';

// 📄 Termos de Uso
import Termos from './screens/Termos';

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
        <Route path="/gravar-audio" element={<GravarAudio />} />

        {/* 🔹 TELA DE ORFEU - introdução da gravação */}
        <Route path="/orfeu-intro" element={<OrfeuIntro />} />

        {/* 🎤 GRAVAÇÃO */}
        <Route path="/audiorecord" element={<AudioRecordPage />} />
        <Route path="/videorecord" element={<VideoRecordPage />} />
        <Route path="/livre-record" element={<LivreRecordPage />} />

        {/* 👥 ÁREA DO CLIENTE */}
        <Route path="/sou-cliente" element={<ClientIdentifyPage />} />
        <Route path="/soucliente" element={<Clientes />} />
        <Route path="/minhas-mensagens" element={<MinhasMensagens />} />

        {/* 💰 RETORNO DO PAYPAL (NÃO MEXER) */}
        <Route path="/retorno" element={<Retorno />} />

        {/* 🔧 ADMIN */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* 📄 TERMOS DE USO */}
        <Route path="/termos" element={<Termos />} />

        {/* ❌ PÁGINA DE ERRO 404 */}
        <Route path="*" element={<Erro />} />

      </Routes>
    </Router>
  );
}

export default App;
