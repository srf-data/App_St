import React, { useState, useEffect } from 'react';

export default function Saidas({ saidasList, setSaidasList, saidaInsumosList, setSaidaInsumosList, produtosList, setProdutosList, insumosList, setInsumosList, isAddModalOpen, setIsAddModalOpen, searchQuery }) {
  const [activeTab, setActiveTab] = useState('produtos'); // Para o Modal
  const [activeMainTab, setActiveMainTab] = useState('produtos'); // Para a Tela Principal
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSaida, setEditingSaida] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [notification, setNotification] = useState(null);
  const ITEMS_PER_PAGE = 20;

  // Escape Key listener for Modais
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingSaida(null);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setIsAddModalOpen]);

  // Form states (Products)
  const [cliente, setCliente] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [total, setTotal] = useState('');
  const [status, setStatus] = useState('pendente');

  // Insumo Exit States
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [insumoQtde, setInsumoQtde] = useState('1');
  const [insumoUnidade, setInsumoUnidade] = useState('');

  // Auto-calculation logic for products
  useEffect(() => {
    if (produtoId && quantidade) {
      const selected = produtosList.find(p => String(p.id) === String(produtoId));
      if (selected) {
        const unitPriceStr = selected.venda.replace('R$', '').replace('.', '').replace(',', '.').trim();
        const unitPrice = parseFloat(unitPriceStr) || 0;
        const qty = parseFloat(quantidade) || 0;
        const calculatedTotal = unitPrice * qty;
        setTotal(calculatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
    }
  }, [produtoId, quantidade, produtosList]);

  const filteredSaidas = saidasList.filter(s => 
    s.cliente.toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    s.produto.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    s.id.toString().includes(searchQuery || '')
  );

  const filteredSaidaInsumos = saidaInsumosList.filter(i => 
    i.nome.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (i.id || '').toString().includes(searchQuery || '')
  );

  const totalPages = activeMainTab === 'produtos' 
    ? (Math.ceil(filteredSaidas.length / ITEMS_PER_PAGE) || 1)
    : (Math.ceil(filteredSaidaInsumos.length / ITEMS_PER_PAGE) || 1);

  const paginatedSaidas = filteredSaidas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedSaidaInsumos = filteredSaidaInsumos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleOpenEdit = (item, type) => {
    setActiveTab(type);
    setEditingSaida(item);
    setIsAddModalOpen(true);
    if (type === 'produtos') {
      setCliente(item.cliente);
      const prod = produtosList.find(p => p.nome === item.produto);
      setProdutoId(prod ? prod.id : '');
      setQuantidade(item.qtde);
      setStatus(item.status);
      setTotal(item.total);
    } else {
      const ins = insumosList.find(i => i.nome === item.nome);
      setSelectedInsumoId(ins ? ins.id : '');
      setInsumoQtde(item.qtde);
    }
  };

  const handleSaveSaida = () => {
    if (activeTab === 'produtos') {
      if (!cliente || !produtoId || !quantidade) return;
      const produtoObj = produtosList.find(p => String(p.id) === String(produtoId));
      
      if (!editingSaida && produtoObj && parseFloat(quantidade) > parseFloat(produtoObj.qtd)) {
        setNotification({ title: 'Saída Bloqueada', message: `Você não tem ${quantidade} unidades de ${produtoObj.nome} em estoque (Saldo atual: ${produtoObj.qtd}).`, type: 'error' });
        return;
      }

      const newId = editingSaida ? editingSaida.id : (Math.max(0, ...saidasList.map(s => parseInt(s.id) || 0)) + 1).toString();
      const newItem = { 
        id: newId, 
        cliente, 
        produto: produtoObj?.nome || 'Produto', 
        qtde: parseInt(quantidade), 
        total: total, 
        data: editingSaida ? editingSaida.data : new Date().toLocaleDateString('pt-BR'), 
        status 
      };

      if (editingSaida) {
          setSaidasList(saidasList.map(s => s.id === editingSaida.id ? newItem : s));
      } else {
          if (produtoObj) {
            const novaQtdeProd = parseFloat(produtoObj.qtd) - parseFloat(quantidade);
            setProdutosList(produtosList.map(p => String(p.id) === String(produtoId) ? { ...p, qtd: novaQtdeProd } : p));
          }
          setSaidasList([newItem, ...saidasList]);
      }
    } else {
      if (!selectedInsumoId || !insumoQtde) return;
      const insumo = insumosList.find(i => String(i.id) === String(selectedInsumoId));
      if (insumo) {
        if (!editingSaida) {
           const usageUnit = insumoUnidade || insumo.unidade;
           let conversionFactor = 1;
           const baseUnit = insumo.unidade.toLowerCase();
           const uUnit = usageUnit.toLowerCase();
           
           if (baseUnit === 'kg' && uUnit === 'g') conversionFactor = 0.001;
           else if (baseUnit === 'l' && uUnit === 'ml') conversionFactor = 0.001;
           else if (baseUnit === 'litro' && uUnit === 'ml') conversionFactor = 0.001;
           else if (baseUnit === '100ml' && uUnit === 'ml') conversionFactor = 0.01;
           else if (baseUnit === 'g' && uUnit === 'kg') conversionFactor = 1000;

           const consumedAmount = parseFloat(insumoQtde) * conversionFactor;
           const novaQtde = parseFloat(insumo.estoqueAtual) - consumedAmount;

           if (novaQtde < 0) {
             setNotification({ title: 'Baixa Bloqueada', message: `O estoque de ${insumo.nome} ficará negativo (${novaQtde.toFixed(3)} ${insumo.unidade}). Verifique a quantidade.`, type: 'error' });
             return;
           }

           setInsumosList(insumosList.map(i => String(i.id) === String(selectedInsumoId) ? { ...i, estoqueAtual: novaQtde } : i));
           setSaidaInsumosList([{ id: Date.now(), nome: insumo.nome, qtde: insumoQtde, unidade: usageUnit, data: new Date().toLocaleDateString('pt-BR') }, ...saidaInsumosList]);
        } else {
           setSaidaInsumosList(saidaInsumosList.map(s => s.id === editingSaida.id ? { ...s, qtde: insumoQtde, unidade: insumoUnidade || insumo.unidade, nome: insumo.nome } : s));
        }
      }
    }

    setNotification({ title: 'Sucesso!', message: editingSaida ? 'Registro atualizado.' : 'Saída registrada com sucesso.', type: 'success' });
    setTimeout(() => { setNotification(null); setIsAddModalOpen(false); }, 1500);
    setEditingSaida(null);
    setCliente(''); setProdutoId(''); setQuantidade(''); setTotal(''); setInsumoQtde(''); setSelectedInsumoId(''); setInsumoUnidade('');
  };

  const isFormValid = activeTab === 'produtos' 
    ? (cliente.trim() !== '' && produtoId !== '' && quantidade !== '')
    : (selectedInsumoId !== '' && insumoQtde !== '');

  return (
    <>
      <div className="flex w-full flex-col gap-2.5 rounded-lg border border-[#F0F0F3] bg-white p-2.5 shadow-[0_0_20px_rgba(139,139,139,0.03)] transition-all overflow-x-auto table-scrollbar relative">
      
      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-[#F0F0F3] px-2 mt-2">
        <button 
          onClick={() => setActiveMainTab('produtos')}
          className={`pb-2 px-4 text-sm font-semibold transition-all ${activeMainTab === 'produtos' ? 'text-[#F84910] border-b-2 border-[#F84910]' : 'text-[#606060] border-b-2 border-transparent hover:text-[#0D0D0D]'}`}
        >
          Saída de Produtos
        </button>
        <button 
          onClick={() => setActiveMainTab('insumos')}
          className={`pb-2 px-4 text-sm font-semibold transition-all ${activeMainTab === 'insumos' ? 'text-[#F84910] border-b-2 border-[#F84910]' : 'text-[#606060] border-b-2 border-transparent hover:text-[#0D0D0D]'}`}
        >
          Saída de Insumos (M.P.)
        </button>
      </div>

      <div className="min-w-[1020px] flex flex-col gap-2.5">
        {activeMainTab === 'produtos' ? (
          <>
            <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
               <div className="w-[80px] text-center">Código</div>
               <div className="flex-1 text-left px-4">Cliente</div>
               <div className="flex-1 text-left px-4">Produto</div>
               <div className="w-[80px] text-center">Quant.</div>
               <div className="w-[110px] text-center">Total</div>
               <div className="w-[110px] text-center">Data</div>
               <div className="w-[100px] text-center">Status</div>
               <div className="w-[80px] text-center">Ações</div>
            </div>
              {paginatedSaidas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border border-[#F0F0F3] my-4 anim-fade-in gap-3 w-full">
                  <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(248,73,16,0.08)] text-[#F84910]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Nenhuma saída encontrada</h3>
                    <p className="font-inter text-sm text-[#606060] max-w-[320px] mt-1">
                      Ainda não há registros de saídas de produtos cadastrados. Adicione uma nova venda para começar.
                    </p>
                  </div>
                </div>
              ) : (
               paginatedSaidas.map((saida, idx) => (
                 <div key={saida.id} className="flex h-[50px] w-full items-center justify-between rounded-lg bg-white px-4 font-inter text-xs font-medium text-[#606060] transition-fluid hover:bg-slate-50 border-b border-[#F0F0F3] last:border-0 anim-slide-up">
                   <div className="w-[80px] text-center text-[#0D0D0D]">{saida.id}</div>
                   <div className="flex-1 text-left px-4 text-[#0D0D0D] font-semibold">{saida.cliente}</div>
                   <div className="flex-1 text-left px-4 truncate">{saida.produto}</div>
                   <div className="w-[80px] text-center">{saida.qtde}</div>
                   <div className="w-[110px] text-center font-bold text-[#F84910]">R$ {saida.total}</div>
                   <div className="w-[110px] text-center">{saida.data}</div>
                   <div className="w-[100px] flex justify-center">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${saida.status === 'entregue' ? 'bg-green-50 text-[#36BA6F]' : 'bg-orange-50 text-[#F84910]'}`}>{saida.status}</div>
                   </div>
                   <div className="w-[80px] flex justify-center">
                     <button 
                       onClick={() => handleOpenEdit(saida, 'produtos')}
                       className="flex size-7 items-center justify-center rounded-lg bg-[#D7D7D740] text-[#606060] hover:bg-[#F84910] hover:text-white transition-fluid cursor-pointer hover-scale"
                       title="Editar Saída"
                     >
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                     </button>
                   </div>
                 </div>
               ))
             )}
          </>
        ) : (
          <>
            <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
               <div className="w-[80px] text-center">Ordem</div>
               <div className="flex-1 text-left px-4">Insumo</div>
               <div className="w-[100px] text-center">Quantidade</div>
               <div className="w-[120px] text-center">Status</div>
               <div className="w-[110px] text-center">Data</div>
               <div className="w-[80px] text-center">Ações</div>
            </div>
            {paginatedSaidaInsumos.map((entry, idx) => (
              <div key={entry.id} className="flex h-[50px] w-full items-center justify-between rounded-lg bg-white px-4 font-inter text-xs font-medium text-[#606060] transition-fluid hover:bg-slate-50 border-b border-[#F0F0F3] last:border-0 anim-slide-up">
                <div className="w-[80px] text-center text-[#0D0D0D]">{idx + 1}</div>
                <div className="flex-1 text-left px-4 text-[#0D0D0D] font-semibold">{entry.nome}</div>
                <div className="w-[100px] text-center font-bold text-red-500">-{entry.qtde}</div>
                <div className="w-[120px] flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    entry.status === 'entregue' ? 'bg-green-100 text-green-600' :
                    entry.status === 'enviado' ? 'bg-blue-100 text-blue-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {entry.status || 'pendente'}
                  </span>
                </div>
                <div className="w-[110px] text-center">{entry.data}</div>
                <div className="w-[80px] flex justify-center">
                  <button 
                    onClick={() => handleOpenEdit(entry, 'insumos')}
                    className="flex size-7 items-center justify-center rounded-lg bg-[#D7D7D740] text-[#606060] hover:bg-[#F84910] hover:text-white transition-fluid cursor-pointer hover-scale"
                    title="Editar Registro"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                </div>
              </div>
            ))}
            {saidaInsumosList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border border-[#F0F0F3] my-4 anim-fade-in gap-3 w-full">
                <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(248,73,16,0.08)] text-[#F84910]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div>
                  <h3 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Nenhuma saída encontrada</h3>
                  <p className="font-inter text-sm text-[#606060] max-w-[320px] mt-1">
                    Ainda não há registros de saídas de insumos cadastrados hoje. Adicione um novo consumo para começar.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer Paginação */}
        <div className="flex h-[48px] w-full items-center justify-between border-t border-[#F0F0F3] px-2 pt-2 mt-2">
          <div className="font-inter text-xs font-medium text-[#606060]">
            {activeMainTab === 'produtos' ? filteredSaidas.length : filteredSaidaInsumos.length} registros encontrados. Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`flex size-6 items-center justify-center rounded cursor-pointer transition-fluid ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)}
                  className={`flex size-6 items-center justify-center rounded text-[10px] font-bold transition-fluid cursor-pointer ${currentPage === i + 1 ? 'bg-[#F84910] text-white shadow-sm scale-110' : 'text-[#606060] hover:bg-gray-100'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`flex size-6 items-center justify-center rounded cursor-pointer transition-fluid ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-[2px] p-4 text-left"
          onMouseDown={() => setIsAddModalOpen(false)}
        >
          <div 
            className="relative flex w-full max-w-[500px] flex-col gap-5 rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onMouseDown={e => e.stopPropagation()}
          >
            {notification && (
              <div className={`mb-2 flex items-start gap-3 rounded-lg border p-4 animate-in slide-in-from-top duration-300 ${notification.type === 'success' ? 'border-green-100 bg-green-50' : notification.type === 'info' ? 'border-blue-100 bg-blue-50' : 'border-red-100 bg-red-50'}`}>
                <div className={`flex size-5 shrink-0 items-center justify-center rounded-full mt-0.5 text-white ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'info' ? 'bg-blue-500' : 'bg-red-500'}`}>
                   {notification.type === 'success' ? (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   ) : notification.type === 'info' ? (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                   ) : (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                   )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h4 className={`font-plus-jakarta text-sm font-bold ${notification.type === 'success' ? 'text-green-800' : notification.type === 'info' ? 'text-blue-800' : 'text-red-800'}`}>{notification.title}</h4>
                  <p className={`font-inter text-xs leading-relaxed ${notification.type === 'success' ? 'text-green-600' : notification.type === 'info' ? 'text-blue-600' : 'text-red-600'}`}>{notification.message}</p>
                </div>
                <button onClick={() => setNotification(null)} className="text-gray-400 hover:bg-gray-100 rounded transition size-6 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
            )}
            <div className="flex h-[40px] w-full items-center justify-between border-b border-[#F0F0F3] pb-4 mb-2">
              <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">
                {editingSaida ? 'Editar Registro / Saída' : 'Adicionar Nova Saída'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="flex size-8 items-center justify-center rounded-full text-[#606060] hover:bg-gray-100 transition-fluid hover:rotate-90">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="flex bg-[#F0F0F3] p-1 rounded-lg mb-2 gap-1 relative">
              <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded shadow-sm transition-transform duration-300 ease-in-out ${activeTab === 'insumos' ? 'translate-x-full' : 'translate-x-0'}`}></div>
              <button onClick={() => setActiveTab('produtos')} className={`relative flex-1 py-1.5 text-[11px] font-semibold rounded transition-colors z-10 uppercase tracking-widest ${activeTab === 'produtos' ? 'text-[#0D0D0D]' : 'text-[#8B8B8B] hover:text-[#606060]'}`}>Saída de Produtos</button>
              <button onClick={() => setActiveTab('insumos')} className={`relative flex-1 py-1.5 text-[11px] font-semibold rounded transition-colors z-10 uppercase tracking-widest ${activeTab === 'insumos' ? 'text-[#0D0D0D]' : 'text-[#8B8B8B] hover:text-[#606060]'}`}>Baixa de Insumos</button>
            </div>

            {activeTab === 'produtos' ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Cliente</label>
                  <input type="text" placeholder="Nome do Cliente" value={cliente} onChange={e => setCliente(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Produto</label>
                    <select value={produtoId} onChange={e => setProdutoId(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm">
                      <option value="">Selecione...</option>
                      {produtosList.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div className="w-[100px] flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Quantidade</label>
                    <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-center text-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm">
                    <option value="pendente">Pendente</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Escolher Insumo para Baixa</label>
                  <select value={selectedInsumoId} onChange={e => setSelectedInsumoId(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm">
                    <option value="">Selecione...</option>
                    {insumosList.map(i => <option key={i.id} value={i.id}>{i.nome} (Estoque: {Number(i.estoqueAtual).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {i.unidade})</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Quantidade (Ex: 0.5 ou 100)</label>
                    <input type="number" step="any" value={insumoQtde} onChange={e => setInsumoQtde(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm" />
                  </div>
                  <div className="w-[140px] flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Unidade Utilizada</label>
                    <select value={insumoUnidade} onChange={e => setInsumoUnidade(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm">
                      <option value="">Referência</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="100ml">100ml</option>
                      <option value="unid">unid</option>
                      <option value="pacote">pacote</option>
                      <option value="caixa">caixa</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2 flex justify-between pt-4 border-t border-[#F0F0F3]">
               {editingSaida && (
                 <button 
                   onClick={() => {
                     setDeleteAction(() => () => {
                       if (activeTab === 'produtos') {
                         // Devolver ao estoque de produtos
                         const prod = produtosList.find(p => p.nome === editingSaida.produto);
                         if (prod) {
                           setProdutosList(produtosList.map(p => p.id === prod.id ? { ...p, qtd: p.qtd + (editingSaida.qtde || 0) } : p));
                         }
                         setSaidasList(saidasList.filter(s => s.id !== editingSaida.id));
                       } else {
                         // Devolver ao estoque de insumos
                         const ins = insumosList.find(i => i.nome === editingSaida.nome);
                         if (ins) {
                           setInsumosList(insumosList.map(i => i.id === ins.id ? { ...i, estoqueAtual: i.estoqueAtual + (editingSaida.qtde || 0) } : i));
                         }
                         setSaidaInsumosList(saidaInsumosList.filter(s => s.id !== editingSaida.id));
                       }
                       setIsAddModalOpen(false);
                       setEditingSaida(null);
                       setShowDeleteModal(false);
                     });
                     setShowDeleteModal(true);
                   }}
                   className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[rgba(186,0,0,0.1)] px-4 font-plus-jakarta text-sm font-semibold tracking-wide text-[#BA0000] hover:bg-[#BA0000] hover:text-white transition-fluid"
                 >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Excluir</span>
                 </button>
               )}
              <button 
                onClick={handleSaveSaida}
                onMouseDown={() => {
                   if (!isFormValid) {
                     setNotification({ title: 'Campos Obrigatórios', message: 'Por favor, preencha todos os campos necessários para registrar a saída.', type: 'error' });
                   }
                }}
                className={`flex h-11 max-w-[280px] ml-auto items-center justify-center gap-3 flex-1 rounded-lg px-8 font-plus-jakarta text-sm font-semibold tracking-wide transition-fluid shadow-md ${isFormValid ? 'bg-[#36BA6F] text-[#BDFFDA] hover:scale-105 cursor-pointer' : 'bg-[#F0F0F3] text-[#BEBEBE] cursor-not-allowed opacity-60'}`}
              >
                <span>Confirmar Registro</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in" onMouseDown={() => { setShowDeleteModal(false); setDeleteAction(null); }}>
          <div className="relative flex w-full max-w-[380px] flex-col items-center gap-5 rounded-xl border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300" onMouseDown={e => e.stopPropagation()}>
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
            </div>
            <div className="text-center">
              <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">Confirmar Exclusão?</h3>
              <p className="font-inter text-sm text-[#606060] mt-1">
                Esta ação cancelará este registro e devolverá as quantidades ao estoque original. Deseja prosseguir?
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button 
                onClick={() => { setShowDeleteModal(false); setDeleteAction(null); }} 
                className="flex-1 h-11 rounded-lg bg-gray-100 font-plus-jakarta text-sm font-bold text-[#606060] hover:bg-gray-200 transition-fluid cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={deleteAction} 
                onMouseDown={() => {
                  setNotification({ title: 'Cancelado!', message: 'O registro de saída foi cancelado com sucesso.', type: 'info' });
                  setTimeout(() => setNotification(null), 3000);
                }}
                className="flex-1 h-11 rounded-lg bg-[#BA0000] font-plus-jakarta text-sm font-bold text-white hover:bg-red-700 transition-fluid shadow-md hover-scale cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
