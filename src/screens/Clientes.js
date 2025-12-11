import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './Clientes.css';

// 🔧 CONFIGURAÇÃO DO SUPABASE
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
  
  // Estado para mensagens já canceladas
  const [mensagensCanceladas, setMensagensCanceladas] = useState([]);

  // 🔍 FUNÇÃO DE BUSCA SIMPLES E EFETIVA
  const buscarMensagensCliente = async (nomeCliente, telefoneCliente) => {
    setCarregando(true);
    setErro('');
    
    try {
      console.log(`🔍 Buscando para: ${nomeCliente} - ${telefoneCliente}`);
      
      const telefoneLimpo = telefoneCliente.replace(/\D/g, '');
      const telefoneBusca = telefoneLimpo.length >= 11 ? telefoneLimpo.slice(2) : telefoneLimpo; // Remove 55 se tiver
      
      console.log('📞 Telefone para busca:', telefoneBusca);
      
      // 1. PRIMEIRO: Buscar TODOS os registros não enviados
      const { data: todosRegistros, error: buscaError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('enviado', false)
        .order('criado_em', { ascending: false });
      
      if (buscaError) {
        console.error('❌ Erro na busca:', buscaError);
        throw new Error('Erro ao acessar o banco de dados');
      }
      
      console.log(`📦 Total de registros não enviados: ${todosRegistros?.length || 0}`);
      
      // 2. FILTRAR os que pertencem a este cliente
      const mensagensDoCliente = [];
      
      if (todosRegistros && todosRegistros.length > 0) {
        todosRegistros.forEach(registro => {
          try {
            // Verificar se dados_completos existe e extrair
            let dadosCliente = {};
            
            if (registro.dados_completos) {
              // Tentar parsear se for string, ou usar diretamente se for objeto
              if (typeof registro.dados_completos === 'string') {
                dadosCliente = JSON.parse(registro.dados_completos);
              } else {
                dadosCliente = registro.dados_completos;
              }
            }
            
            console.log('📄 Dados extraídos do registro:', dadosCliente);
            
            // Verificar se é do cliente atual
            const telefoneRegistro = dadosCliente.telefone || '';
            const nomeRegistro = dadosCliente.destinatario || dadosCliente.nome || '';
            
            const telefoneLimpoRegistro = telefoneRegistro.replace(/\D/g, '');
            const telefoneRegistroBusca = telefoneLimpoRegistro.length >= 11 ? 
              telefoneLimpoRegistro.slice(2) : telefoneLimpoRegistro;
            
            console.log('🔍 Comparando:', {
              telefoneCliente: telefoneBusca,
              telefoneRegistro: telefoneRegistroBusca,
              nomeCliente: nomeCliente.toLowerCase(),
              nomeRegistro: nomeRegistro.toLowerCase()
            });
            
            // Critério de busca: telefone OU nome correspondente
            const telefoneCorresponde = telefoneRegistroBusca && 
              telefoneRegistroBusca.includes(telefoneBusca);
            
            const nomeCorresponde = nomeRegistro && 
              nomeRegistro.toLowerCase().includes(nomeCliente.toLowerCase());
            
            if (telefoneCorresponde || nomeCorresponde) {
              // Formatar mensagem para exibição
              const mensagemFormatada = {
                id: registro.id,
                tipo: dadosCliente.tipo || 'audio',
                order_id: dadosCliente.order_id || dadosCliente.orderID || 'N/A',
                status: 'pago',
                destinatario: nomeRegistro || 'Não informado',
                telefone: telefoneRegistro,
                data_agendamento: registro.data_agendamento || dadosCliente.data_agendamento,
                hora_agendamento: registro.hora_agendamento || dadosCliente.hora_agendamento,
                link_midia: registro.link_midia || dadosCliente.link_midia,
                enviado: registro.enviado,
                // Para debug
                _dadosOriginais: registro
              };
              
              mensagensDoCliente.push(mensagemFormatada);
              console.log('✅ Mensagem adicionada:', mensagemFormatada);
            }
            
          } catch (erroProcessamento) {
            console.error('❌ Erro ao processar registro:', registro.id, erroProcessamento);
          }
        });
      }
      
      console.log(`🎯 Mensagens encontradas: ${mensagensDoCliente.length}`);
      
      // 3. Atualizar estado
      setMensagens(mensagensDoCliente);
      
      // 4. Mostrar resultado
      if (mensagensDoCliente.length === 0) {
        setErro('Nenhuma mensagem encontrada. Verifique nome/telefone.');
      }
      
    } catch (error) {
      console.error('❌ Erro geral:', error);
      setErro('Erro ao buscar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // Função para fazer login do cliente
  const fazerLoginCliente = (e) => {
    e.preventDefault();
    
    // Validação
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

  // Função para cancelar envio de mensagem
  const cancelarEnvio = async (mensagemId, tipo) => {
    if (mensagensCanceladas.includes(mensagemId)) {
      alert('Esta mensagem já foi cancelada anteriormente.');
      return;
    }
    
    if (!window.confirm('Tem certeza que deseja cancelar este envio?\n\nVocê receberá 1 crédito de ' + (tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO'))) {
      return;
    }
    
    try {
      // Atualizar créditos
      setCreditos(prev => ({
        ...prev,
        [tipo]: prev[tipo] + 1
      }));
      
      // Remover da lista
      setMensagens(prev => prev.filter(m => m.id !== mensagemId));
      setMensagensCanceladas(prev => [...prev, mensagemId]);
      
      // Marcar como enviado no banco (para não aparecer mais)
      const { error } = await supabase
        .from('agendamentos')
        .update({ enviado: true })
        .eq('id', mensagemId);

      if (error) {
        console.error('Erro ao atualizar:', error);
      }
      
      alert('✅ Envio cancelado! Crédito adicionado.');
      
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao cancelar.');
    }
  };

  // Função para criar nova mensagem usando crédito
  const criarNovaMensagemComCredito = (tipo) => {
    if (creditos[tipo] <= 0) {
      alert(`Você não tem créditos de ${tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO'}.`);
      return;
    }
    
    if (!window.confirm(`Usar 1 crédito de ${tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO'}?`)) {
      return;
    }
    
    // Reduzir crédito
    setCreditos(prev => ({
      ...prev,
      [tipo]: prev[tipo] - 1
    }));
    
    // Salvar dados do cliente
    localStorage.setItem('clienteNome', clienteNome);
    localStorage.setItem('clienteTelefone', telefone);
    localStorage.setItem('usandoCredito', 'true');
    localStorage.setItem('tipoCredito', tipo);
    
    // Ir para gravação
    navigate(tipo === 'audio' ? '/audiorecord' : '/videorecord');
  };

  // Função para fazer logout
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

  // Formatar data
  const formatarData = (dataString) => {
    if (!dataString) return 'Data não definida';
    try {
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR');
    } catch {
      return dataString;
    }
  };

  // BOTÃO DE DEBUG - PARA VER O QUE TEM NO BANCO
  const verDadosBanco = async () => {
    try {
      const { data } = await supabase
        .from('agendamentos')
        .select('*')
        .limit(5);
      
      if (data) {
        console.log('=== DADOS REAIS NO BANCO ===');
        data.forEach(item => {
          console.log('ID:', item.id);
          console.log('Data:', item.data_agendamento);
          console.log('Hora:', item.hora_agendamento);
          console.log('Dados completos:', item.dados_completos);
          console.log('Enviado:', item.enviado);
          console.log('---');
        });
        alert('Dados logados no console (F12)');
      }
    } catch (error) {
      console.error('Erro debug:', error);
    }
  };

  return (
    <div className="clientes-container">
      <header className="clientes-header">
        <h1>🦉 Área do Cliente</h1>
        {clienteLogado && (
          <div className="header-botoes">
            <button className="btn-debug" onClick={verDadosBanco}>
              🔍 Ver Banco
            </button>
            <button className="logout-btn" onClick={fazerLogout}>
              Sair
            </button>
          </div>
        )}
      </header>

      <main className="clientes-main">
        {!clienteLogado ? (
          // TELA DE LOGIN
          <div className="login-section">
            <h2>👋 Acesse Suas Mensagens</h2>
            <p>Digite seu nome e telefone usados no cadastro</p>
            
            <form onSubmit={fazerLoginCliente} className="login-form">
              <div className="form-group">
                <label>Seu nome completo:</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  required
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Seu telefone (com DDD):</label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="11999998888"
                  required
                  className="form-input"
                />
              </div>
              
              {erro && <div className="erro-mensagem">{erro}</div>}
              
              <button type="submit" className="btn-primary" disabled={carregando}>
                {carregando ? 'Buscando...' : 'Acessar Minhas Mensagens'}
              </button>
              
              <div className="dica-login">
                <p><strong>Dica:</strong> Use os mesmos dados do pagamento</p>
              </div>
            </form>
          </div>
        ) : (
          // TELA DO CLIENTE LOGADO
          <div className="cliente-logado">
            <div className="saudacao">
              <h2>👋 Olá, {clienteNome}!</h2>
              {carregando ? (
                <p>🔄 Buscando suas mensagens...</p>
              ) : mensagens.length > 0 ? (
                <p className="status-sucesso">✅ {mensagens.length} mensagem(ns) encontrada(s)</p>
              ) : (
                <p className="status-vazio">📭 Nenhuma mensagem encontrada</p>
              )}
            </div>
            
            {/* CRÉDITOS */}
            <div className="creditos-container">
              <h3>💰 Seus Créditos</h3>
              <div className="creditos-cards">
                <div className={`credito-card ${creditos.audio > 0 ? 'disponivel' : 'indisponivel'}`}>
                  <div className="credito-icon">🎵</div>
                  <span className="credito-tipo">Áudios</span>
                  <span className="credito-quantidade">{creditos.audio}</span>
                </div>
                <div className={`credito-card ${creditos.video > 0 ? 'disponivel' : 'indisponivel'}`}>
                  <div className="credito-icon">🎬</div>
                  <span className="credito-tipo">Vídeos</span>
                  <span className="credito-quantidade">{creditos.video}</span>
                </div>
              </div>
            </div>
            
            {/* MENSAGENS */}
            <div className="mensagens-section">
              {carregando ? (
                <div className="carregando">
                  <p>Buscando no banco de dados...</p>
                </div>
              ) : mensagens.length === 0 ? (
                <div className="nenhuma-mensagem">
                  <p>📭 Nenhuma mensagem encontrada</p>
                  <button className="btn-voltar" onClick={fazerLogout}>
                    ↻ Tentar outros dados
                  </button>
                </div>
              ) : (
                <div className="mensagens-lista">
                  <h3>📋 Suas Mensagens Agendadas</h3>
                  
                  {mensagens.map((msg) => (
                    <div key={msg.id} className="mensagem-card">
                      <div className="mensagem-header">
                        <span className={`tipo-badge ${msg.tipo}`}>
                          {msg.tipo === 'audio' ? '🎵 Áudio' : '🎬 Vídeo'}
                        </span>
                        <span className="status-badge">
                          {formatarData(msg.data_agendamento)} - {msg.hora_agendamento}
                        </span>
                      </div>
                      
                      <div className="mensagem-info">
                        <p><strong>Para:</strong> {msg.destinatario}</p>
                        <p><strong>Telefone:</strong> {msg.telefone}</p>
                        <p><strong>ID:</strong> {msg.order_id}</p>
                      </div>
                      
                      <div className="mensagem-acoes">
                        <button 
                          className="btn-cancelar"
                          onClick={() => cancelarEnvio(msg.id, msg.tipo)}
                          disabled={mensagensCanceladas.includes(msg.id)}
                        >
                          {mensagensCanceladas.includes(msg.id) ? '❌ Já Cancelado' : '❌ Cancelar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* BOTÃO PARA CRIAR NOVA */}
            <div className="nova-mensagem-section">
              <button 
                className="btn-nova-mensagem"
                onClick={() => navigate('/servicos')}
              >
                🎁 Criar Nova Mensagem
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="clientes-footer">
        <button className="btn-voltar" onClick={() => navigate('/')}>
          ← Voltar para Home
        </button>
      </footer>
    </div>
  );
}

export default Clientes;
