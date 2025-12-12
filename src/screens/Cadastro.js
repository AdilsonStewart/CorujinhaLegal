// No início do componente Servicos, após os imports:
useEffect(() => {
  // Pega os dados do localStorage
  const clienteSalvo = localStorage.getItem('clienteCorujinha');
  
  if (clienteSalvo) {
    const cliente = JSON.parse(clienteSalvo);
    console.log("📦 Cliente recuperado:", cliente);
    
    // Salva no Firebase se não tiver idFirebase
    if (!cliente.idFirebase) {
      salvarNoFirebase(cliente);
    }
  }
}, []);

// Função para salvar no Firebase
const salvarNoFirebase = async (cliente) => {
  try {
    // Usa as importações do config.js
    const { db } = await import("./firebase/config.js");
    const { collection, addDoc } = await import("firebase/firestore");
    
    const docRef = await addDoc(collection(db, "Clientes"), {
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      cpfCnpj: cliente.cpfCnpj,
      dataNascimento: cliente.dataNascimento,
      criadoEm: cliente.criadoEm,
      timestamp: cliente.timestamp
    });
    
    console.log("✅ Cliente salvo no Firebase:", docRef.id);
    
    // Atualiza localStorage com ID
    cliente.idFirebase = docRef.id;
    localStorage.setItem('clienteCorujinha', JSON.stringify(cliente));
    
  } catch (error) {
    console.error("❌ Erro ao salvar no Firebase:", error);
  }
};
