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
      
      // 1. Buscar mensagens AGENDADAS do cliente
      const { data: mensagensData, error: mensagensError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('destinatario', nomeCliente)
        .eq('telefone', telefoneCliente.replace(/\D/g, '')) // Remove não-números
        .eq('status', 'pago')
        .eq('enviado', false)
        .order('data_agendamento', { ascending: true });

      if (mensagensError) {
        console.error('❌ Erro ao buscar mensagens:', mensagensError);
        throw new Error('Erro ao buscar suas mensagens. Tente novamente.');
      }

      console.log(`✅ ${mensagensData?.length || 0} mensagens encontradas`);
      
      // 2. Buscar créditos do cliente (simulação - você pode ajustar depois)
      // Para começar, vamos inicializar com 0 créditos
      // Você pode criar uma tabela 'creditos' no Supabase depois
      const creditosIniciais = {
        audio: 0,
        video: 0
      };
      
      // 3. Atualizar estados
      setMensagens(mensagensData || []);
      setCreditos(creditosIniciais);
      
    } catch (error) {
      console.error('❌ Erro no processo:', error);
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  // Função para fazer login do cliente
  const fazerLoginCliente = (e) => {
    e.preventDefault(); // 🔥 IMPORTANTE: Impede que a página recarregue
    
    // Validação básica
    if (!nome.trim() || !telefone.trim()) {
      setErro('Por favor, preencha seu nome e telefone');
      return;
    }
    
    // Validar telefone (mínimo 10 dígitos)
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      setErro('Digite um telefone válido com DDD (ex: 11999998888)');
      return;
    }
    
    setClienteNome(nome);
    setClienteLogado(true);
    buscarMensagensCliente(nome, telefone);
  };

  // Função para cancelar envio de mensagem e dar crédito
  const cancelarEnvio = async (mensagemId, orderId, tipo) => {
    // Verificar se já cancelou esta mensagem antes
    if (mensagensCanceladas.includes(mensagemId)) {
      alert('❌ ATENÇÃO!\n\nEsta mensagem já foi cancelada anteriormente.\nPor razões técnicas, não é possível cancelar a mesma mensagem duas vezes.');
      return;
    }
    
    if (!window.confirm('Tem certeza que deseja cancelar este envio?\n\n✅ Você receberá 1 crédito de ' + (tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO') + ' para usar em outra mensagem.')) {
      return;
    }
    
    try {
      // 1. Atualizar créditos localmente (dá 1 crédito do tipo cancelado)
      setCreditos(prev => ({
        ...prev,
        [tipo]: prev[tipo] + 1
      }));
      
      // 2. Marcar mensagem como cancelada no estado
      setMensagens(prev => prev.filter(m => m.id !== mensagemId));
      setMensagensCanceladas(prev => [...prev, mensagemId]);
      
      // 3. Atualizar no Supabase (marcar como cancelado)
      const { error } = await supabase
        .from('agendamentos')
        .update({ 
          status: 'cancelado',
          enviado: true // Marcamos como "enviado" para não aparecer mais
        })
        .eq('id', mensagemId);

      if (error) {
        console.error('❌ Erro ao atualizar no banco:', error);
        alert('Mensagem cancelada, mas houve um erro ao atualizar o banco.');
      }
      
      alert('✅ Envio cancelado com sucesso!\n\n🎉 1 crédito de ' + (tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO') + ' foi adicionado à sua conta!');
      
    } catch (error) {
      console.error('❌ Erro ao cancelar:', error);
      alert('Erro ao cancelar o envio. Tente novamente.');
    }
  };

  // Função para criar nova mensagem usando crédito (vai DIRETO para gravação)
  const criarNovaMensagemComCredito = (tipo) => {
    if (creditos[tipo] <= 0) {
      alert(`❌ Você não tem créditos de ${tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO'} disponíveis.`);
      return;
    }
    
    // Confirmar com o cliente
    if (!window.confirm(`Usar 1 crédito de ${tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO'} para criar uma nova mensagem?`)) {
      return;
    }
    
    // Reduzir crédito localmente
    setCreditos(prev => ({
      ...prev,
      [tipo]: prev[tipo] - 1
    }));
    
    // Salvar dados do cliente para usar na gravação
    localStorage.setItem('clienteNome', clienteNome);
    localStorage.setItem('clienteTelefone', telefone);
    localStorage.setItem('usandoCredito', 'true');
    localStorage.setItem('tipoCredito', tipo);
    
    // 🚨 IMPORTANTE: Navegar DIRETO para gravação (NÃO vai para /servicos)
    // /servicos é apenas para NOVOS pagamentos via PayPal
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
    
    // Limpar dados do localStorage
    localStorage.removeItem('clienteNome');
    localStorage.removeItem('clienteTelefone');
    localStorage.removeItem('usandoCredito');
    localStorage.removeItem('tipoCredito');
  };

  // Formatar data para exibição
  const formatarData = (dataString) => {
    if (!dataString) return 'Data não definida';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

  return (
    <div className="clientes-container">
      <header className="clientes-header">
        <h1>🦉 Área do Cliente CorujinhaLegal</h1>
        {clienteLogado && (
          <button className="logout-btn" onClick={fazerLogout}>
            Sair da Conta
          </button>
        )}
      </header>

      <main className="clientes-main">
        {!clienteLogado ? (
          // TELA DE LOGIN DO CLIENTE
          <div className="login-section">
            <h2>👋 Acesse Suas Mensagens</h2>
            <p className="subtitulo">Digite seu nome e telefone para ver seus agendamentos</p>
            
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
                  placeholder="Ex: 11999998888"
                  required
                  className="form-input"
                />
                <small className="dica">Somente números, com DDD</small>
              </div>
              
              {erro && <div className="erro-mensagem">{erro}</div>}
              
              <button type="submit" className="btn-primary" disabled={carregando}>
                {carregando ? '🔍 Buscando seus dados...' : '📱 Entrar na Minha Conta'}
              </button>
            </form>
            
            <div className="info-box">
              <p>ℹ️ <strong>Como funciona?</strong></p>
              <p>Digite o mesmo nome e telefone que usou ao criar suas mensagens.</p>
              <p>Você verá todas as suas mensagens agendadas e poderá gerenciá-las.</p>
            </div>
          </div>
        ) : (
          // TELA DO CLIENTE LOGADO
          <div className="cliente-logado">
            <div className="saudacao">
              <h2>👋 Olá, {clienteNome}!</h2>
              <p className="boas-vindas">Que bom te ter aqui, ficamos felizes com seu retorno! 🎉</p>
            </div>
            
            {/* SEÇÃO DE CRÉDITOS */}
            <div className="creditos-container">
              <h3>💰 Seus Créditos Disponíveis</h3>
              <div className="creditos-cards">
                <div className={`credito-card ${creditos.audio > 0 ? 'disponivel' : 'indisponivel'}`}>
                  <div className="credito-icon">🎵</div>
                  <div className="credito-info">
                    <span className="credito-tipo">Áudios</span>
                    <span className="credito-quantidade">{creditos.audio}</span>
                  </div>
                  <div className="credito-legenda">Créditos</div>
                </div>
                
                <div className={`credito-card ${creditos.video > 0 ? 'disponivel' : 'indisponivel'}`}>
                  <div className="credito-icon">🎬</div>
                  <div className="credito-info">
                    <span className="credito-tipo">Vídeos</span>
                    <span className="credito-quantidade">{creditos.video}</span>
                  </div>
                  <div className="credito-legenda">Créditos</div>
                </div>
              </div>
              
              {/* 🚨 IMPORTANTE: Mostra opção de usar crédito APENAS se tiver crédito */}
              {(creditos.audio > 0 || creditos.video > 0) ? (
                <div className="usar-creditos">
                  <p className="instrucao">💡 <strong>Usar crédito para criar mensagem:</strong></p>
                  <div className="credito-botoes">
                    {creditos.audio > 0 && (
                      <button 
                        className="btn-credito audio"
                        onClick={() => criarNovaMensagemComCredito('audio')}
                      >
                        🎵 Usar Crédito de Áudio
                      </button>
                    )}
                    {creditos.video > 0 && (
                      <button 
                        className="btn-credito video"
                        onClick={() => criarNovaMensagemComCredito('video')}
                      >
                        🎬 Usar Crédito de Vídeo
                      </button>
                    )}
                  </div>
                  <small className="dica-credito">Usando crédito, você vai DIRETO para gravação!</small>
                </div>
              ) : (
                <div className="sem-creditos">
                  <p className="instrucao">💡 <strong>Como conseguir créditos?</strong></p>
                  <p>Cancele uma mensagem agendada e você ganha 1 crédito do mesmo tipo!</p>
                </div>
              )}
            </div>
            
            {/* SEÇÃO DE MENSAGENS AGENDADAS */}
            <div className="mensagens-section">
              {carregando ? (
                <div className="carregando">
                  <div className="spinner"></div>
                  <p>Buscando suas mensagens no banco de dados...</p>
                </div>
              ) : mensagens.length === 0 ? (
                <div className="nenhuma-mensagem">
                  <div className="icon-vazio">📭</div>
                  <h3>Nenhuma mensagem pendente encontrada</h3>
                  <p>Verificamos no banco de dados e não encontramos nenhuma mensagem pendente para entrega no seu nome.</p>
                  
                  <div className="acoes-vazio">
                    {/* 🚨 REMOVIDO: Botão para /servicos */}
                    {/* 🚨 NÃO tem opção de criar nova mensagem sem crédito aqui */}
                    <p className="aviso-compra">
                      <strong>Para criar uma nova mensagem:</strong><br/>
                      1. Vá para a página inicial e clique em "Criar Meu Lembrete"<br/>
                      2. Faça o pagamento via PayPal<br/>
                      3. Você será redirecionado para gravar sua mensagem
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mensagens-lista">
                  <h3>📋 Suas Mensagens Agendadas</h3>
                  <p className="subtitulo-lista">Você tem {mensagens.length} mensagem(ns) agendada(s)</p>
                  
                  {mensagens.map((msg) => (
                    <div key={msg.id} className="mensagem-card">
                      <div className="mensagem-header">
                        <span className={`tipo-badge ${msg.tipo}`}>
                          {msg.tipo === 'audio' ? '🎵 Mensagem de Áudio' : '🎬 Mensagem de Vídeo'}
                        </span>
                        <span className="status-badge agendado">
                          Agendado
                        </span>
                      </div>
                      
                      <div className="mensagem-info">
                        <div className="info-item">
                          <span className="info-label">Para:</span>
                          <span className="info-valor">{msg.destinatario || 'Não informado'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Data:</span>
                          <span className="info-valor">{formatarData(msg.data_agendamento)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Horário:</span>
                          <span className="info-valor">{msg.hora_agendamento || 'Não definido'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">ID do Pedido:</span>
                          <span className="info-valor codigo">{msg.order_id || 'Não disponível'}</span>
                        </div>
                      </div>
                      
                      <div className="mensagem-acoes">
                        <button 
                          className="btn-cancelar"
                          onClick={() => cancelarEnvio(msg.id, msg.order_id, msg.tipo)}
                          disabled={mensagensCanceladas.includes(msg.id)}
                        >
                          {mensagensCanceladas.includes(msg.id) ? '❌ Já Cancelado' : '❌ Cancelar Envio'}
                        </button>
                        
                        <div className="aviso-container">
                          <p className="aviso-credito">
                            💡 Ao cancelar: <strong>Recebe 1 crédito de {msg.tipo === 'audio' ? 'ÁUDIO' : 'VÍDEO'}</strong>
                          </p>
                          <p className="aviso-tecnico">
                            ⚠️ Por razões técnicas: <strong>NÃO É POSSÍVEL fazer SEGUNDO CANCELAMENTO</strong> da mesma mensagem.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 🚨 REMOVIDA: Seção "Quer enviar mais uma mensagem?" */}
            {/* NÃO pode direcionar para /servicos daqui */}
          </div>
        )}
      </main>

      <footer className="clientes-footer">
        <p>🦉 CorujinhaLegal - Suas mensagens com carinho 💌</p>
        <div className="footer-botoes">
          <button 
            className="btn-voltar"
            onClick={() => navigate('/')}
          >
            ← Voltar para Home
          </button>
          <button 
            className="btn-suporte"
            onClick={() => alert('Entre em contato pelo WhatsApp: (11) 99999-8888')}
          >
            💬 Precisa de Ajuda?
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Clientes;
