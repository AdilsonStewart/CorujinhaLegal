import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './Clientes.css';

// 🔧 CONFIGURAÇÃO DO SUPABASE (MESMA DO AUDIORECORDPAGE)
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

function Clientes() {
  const navigate = useNavigate();
  
  // Estados para login do cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [clienteLogado, setClienteLogado] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  
  // Estados para créditos
  const [creditos, setCreditos] = useState({
    audio: 0,
    video: 0
  });
  
  // Estado para mensagens já canceladas (evitar segundo cancelamento)
  const [mensagensCanceladas, setMensagensCanceladas] = useState([]);

  // Função para buscar mensagens do cliente no Supabase
  const buscarMensagensCliente = async (nomeCliente, telefoneCliente) => {
    setCarregando(true);
    setErro('');
    
    try {
      console.log(`🔍 Buscando mensagens para: ${nomeCliente} - ${telefoneCliente}`);
      
      const { data: mensagensData, error: mensagensError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('destinatario', nomeCliente)
        .eq('telefone', telefoneCliente.replace(/\D/g, ''))
        .eq('status', 'pago')
        .eq('enviado', false)
        .order('data_agendamento', { ascending: true });

      if (mensagensError) {
        throw new Error('Erro ao buscar suas mensagens. Tente novamente.');
      }

      const creditosIniciais = {
        audio: 0,
        video: 0
      };
      
      setMensagens(mensagensData || []);
      setCreditos(creditosIniciais);
      
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  const fazerLoginCliente = (e) => {
    e.preventDefault();
    
    if (!nome.trim() || !telefone.trim()) {
      setErro('Por favor, preencha seu nome e telefone');
      return;
    }
    
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      setErro('Digite um telefone válido com DDD (ex: 11999998888)');
      return;
    }
    
    setClienteNome(nome);
    setClienteLogado(true);
    buscarMensagensCliente(nome, telefone);
  };

  const cancelarEnvio = async (mensagemId, orderId, tipo) => {
    if (mensagensCanceladas.includes(mensagemId)) {
      alert('❌ ATENÇÃO!\n\nEsta mensagem já foi cancelada anteriormente.');
      return;
    }
    
    if (!window.confirm('Tem certeza que deseja cancelar este envio?\n\nVocê receberá 1 crédito.')) {
      return;
    }
    
    try {
      setCreditos(prev => ({
        ...prev,
        [tipo]: prev[tipo] + 1
      }));
      
      setMensagens(prev => prev.filter(m => m.id !== mensagemId));
      setMensagensCanceladas(prev => [...prev, mensagemId]);
      
      const { error } = await supabase
        .from('agendamentos')
        .update({ 
          status: 'cancelado',
          enviado: true
        })
        .eq('id', mensagemId);

      if (error) {
        alert('Mensagem cancelada, mas houve um erro ao atualizar o banco.');
      }
      
      alert('Envio cancelado com sucesso!');
      
    } catch (error) {
      alert('Erro ao cancelar o envio.');
    }
  };

  const criarNovaMensagemComCredito = (tipo) => {
    if (creditos[tipo] <= 0) {
      alert(`Você não tem créditos de ${tipo}`);
      return;
    }
    
    setCreditos(prev => ({
      ...prev,
      [tipo]: prev[tipo] - 1
    }));
    
    localStorage.setItem('clienteNome', clienteNome);
    localStorage.setItem('clienteTelefone', telefone);
    localStorage.setItem('usandoCredito', 'true');
    localStorage.setItem('tipoCredito', tipo);
    
    navigate(tipo === 'audio' ? '/audiorecord' : '/videorecord');
  };

  const criarNovaMensagem = () => {
    localStorage.setItem('clienteNome', clienteNome);
    localStorage.setItem('clienteTelefone', telefone);
    navigate('/servicos');
  };

  const fazerLogout = () => {
    setClienteLogado(false);
    setNome('');
    setTelefone('');
    setMensagens([]);
    setCreditos({ audio: 0, video: 0 });
    setMensagensCanceladas([]);
    setErro('');
    
    localStorage.removeItem('clienteNome');
    localStorage.removeItem('clienteTelefone');
    localStorage.removeItem('usandoCredito');
    localStorage.removeItem('tipoCredito');
  };

  const formatarData = (dataString) => {
    if (!dataString) return 'Data não definida';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

  return (
    <div className="clientes-container">
      <header className="clientes-header">
        <h1>
          <img 
            src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTZycHZycGcxeTB1aDE1OWR0OGlxNHd2cGgycTB5MHF3MThtbjVlciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/rVY6OYHpnJNln3SwFu/giphy.gif" 
            alt="Corujinha Logo"
            style={{ width: '30px', height: '30px', marginRight: '8px', verticalAlign: 'middle' }}
          />
          Área do Cliente CorujinhaLegal
        </h1>

        {clienteLogado && (
          <button className="logout-btn" onClick={fazerLogout}>
            Sair da Conta
          </button>
        )}
      </header>

      {/* resto do componente permanece INTATO */}
      {/* ... */}
      
    </div>
  );
}

export default Clientes;
