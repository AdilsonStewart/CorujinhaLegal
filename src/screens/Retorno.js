import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// CONEXÃO COM SUPABASE
const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';
const supabase = createClient(supabaseUrl, supabaseKey);

const Retorno = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const processarPagamento = async () => {
      // PEGA DADOS DA URL DO PAYPAL
      const tipo = searchParams.get('tipo');
      const status = searchParams.get('status');
      const orderID = searchParams.get('orderID');
      const paypalOrderID = searchParams.get('paypalOrderID');

      // SE CANCELOU, VOLTA
      if (status === 'cancel') {
        alert('Pagamento cancelado');
        navigate('/servicos');
        return;
      }

      // SE PAGOU, CONTINUA
      if (status === 'success') {
        
        // BUSCA DADOS DO CLIENTE (do cadastro)
        const clienteNome = localStorage.getItem('clienteNome') || '';
        const clienteTelefone = localStorage.getItem('clienteTelefone') || '';
        
        console.log('💾 SALVANDO NO BANCO:', {
          nome: clienteNome,
          telefone: clienteTelefone,
          tipo: tipo,
          orderID: orderID
        });

        // ⭐⭐ SALVA NO SUPABASE ⭐⭐
        try {
          // PREPARA DADOS
          const dadosParaSalvar = {
            data_agendamento: new Date().toISOString().split('T')[0],
            hora_agendamento: '12:00:00',
            criado_em: new Date().toISOString(),
            enviado: false,
            dados_completos: {
              // ⭐ DADOS DO CLIENTE (para a área "Sou Cliente" encontrar depois)
              remetente: clienteNome,
              telefone_remetente: clienteTelefone,
              cliente_nome: clienteNome,
              cliente_telefone: clienteTelefone,
              // Dados do pedido
              tipo: tipo,
              order_id: orderID,
              status: 'pago',
              valor: tipo === 'audio' ? 5.00 : 10.00
            },
            evento_paypal: `PAYMENT_${orderID}`,
            valor: tipo === 'audio' ? 5.00 : 10.00
          };

          // ENVIA PARA O BANCO
          const { error } = await supabase
            .from('agendamentos')
            .insert([dadosParaSalvar]);

          if (error) {
            console.error('Erro ao salvar:', error);
          } else {
            console.log('✅ Dados salvos no banco!');
          }

        } catch (erro) {
          console.error('Erro geral:', erro);
        }

        // SALVA NO LOCALSTORAGE TAMBÉM
        localStorage.setItem('dadosPagamento', JSON.stringify({
          tipo: tipo,
          orderID: orderID,
          clienteNome: clienteNome,
          clienteTelefone: clienteTelefone
        }));

        // REDIRECIONA PARA GRAVAR
        setTimeout(() => {
          if (tipo === 'audio') {
            navigate(`/audiorecord?orderID=${orderID}`);
          } else {
            navigate(`/videorecord?orderID=${orderID}`);
          }
        }, 1500);

        return;
      }

      // SE DEU ERRADO
      alert('Erro no pagamento');
      navigate('/servicos');
    };

    processarPagamento();
  }, [searchParams, navigate]);

  // TELA DE CARREGAMENTO
  return (
    <div style={{
      textAlign: 'center',
      padding: '100px 20px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ fontSize: '60px', color: 'green' }}>✅</div>
      <h1>Pagamento Confirmado!</h1>
      <p>Salvando seus dados...</p>
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <p>🦉 <strong>Processando seu pedido</strong></p>
        <p>• Salvando seus dados no sistema...</p>
      </div>
    </div>
  );
};

export default Retorno;
