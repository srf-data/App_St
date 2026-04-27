import React, { useState, useEffect } from 'react';
import { cleanNotificationMessage, formatBRNumber } from './utils/validators';

export default function Saidas({ saidasList, setSaidasList, saidaInsumosList, setSaidaInsumosList, produtosList, setProdutosList, insumosList, setInsumosList, fetchSaidas, fetchSaidaInsumos, fetchProdutos, fetchInsumos, isAddModalOpen, setIsAddModalOpen, searchQuery, setNotification }) {
  const [activeTab, setActiveTab] = useState('produtos');
  const [activeMainTab, setActiveMainTab] = useState('produtos');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSaida, setEditingSaida] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);

  const ITEMS_PER_PAGE = 20;

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

  const [cliente, setCliente] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [total, setTotal] = useState('');
  const [status, setStatus] = useState('pendente');

  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [insumoQuantidade, setInsumoQuantidade] = useState('');
  const [insumoUnidade, setInsumoUnidade] = useState('');

  const clearForm = () => {
    setCliente('');
    setProdutoId('');
    setQuantidade('');
    setStatus('pendente');
    setValorUnitario('');
    setDesconto('0');
    setSelectedInsumoId('');
    setInsumoQuantidade('');
    setInsumoUnidade('');
    setEditingSaida(null);
  };

  useEffect(() => {
    if (produtoId && quantidade) {
      const selected = produtosList.find(p => String(p.id) === String(produtoId));
      if (selected) {
        if (!editingSaida && !valorUnitario) {
            const price = parseFloat(selected.venda.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
            setValorUnitario(String(price));
        }

        const unit = parseFloat(valorUnitario) || 0;
        const qty = parseFloat(quantidade) || 0;
        const desc = parseFloat(desconto) || 0;
        
        const calculatedTotal = (unit * qty) - desc;
        setTotal(calculatedTotal.toFixed(2));
      }
    }
  }, [produtoId, quantidade, valorUnitario, desconto, produtosList, editingSaida]);

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
      setValorUnitario(String(item.valorUnitario || 0));
      setDesconto(String(item.desconto || 0));
      setStatus(item.status);
      setTotal(String(item.totalNum || 0));
    } else {
      const ins = insumosList.find(i => i.nome === item.nome);
      setSelectedInsumoId(ins ? ins.id : '');
      setInsumoQtde(item.qtde);
      setInsumoUnidade(ins ? ins.unidade : '');
    }
  };

  const handleSaveSaida = async () => {
    try {
      if (activeTab === 'produtos') {
        if (!cliente || !produtoId || !quantidade) return;
        const produtoObj = produtosList.find(p => String(p.id) === String(produtoId));
        
        if (!editingSaida && produtoObj && parseFloat(quantidade) > parseFloat(produtoObj.qtd)) {
          setNotification({ title: 'Saída Bloqueada', message: `Você não tem ${formatBRNumber(quantidade, 0)} unidades de ${produtoObj.nome} em estoque (Saldo atual: ${formatBRNumber(produtoObj.qtd, 0)}).`, type: 'error' });
          return;
        }

        const payload = {
          produtoId: parseInt(produtoId),
          cliente,
          quantidade: parseFloat(quantidade),
          valorUnitario: parseFloat(valorUnitario) || 0,
          desconto: parseFloat(desconto) || 0,
          total: parseFloat(total) || 0,
          status
        };

        const res = await fetch(`/api/saidas/produtos${editingSaida ? '/' + editingSaida.id : ''}`, {
          method: editingSaida ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Erro ao salvar saída de produto");

        setNotification({ title: 'Sucesso!', message: `Saída de ${produtoObj?.nome || 'produto'} registrada.`, type: 'success' });
      } else {
        if (!selectedInsumoId || !insumoQtde) return;
        const insumoObj = insumosList.find(i => String(i.id) === String(selectedInsumoId));
        let realQtde = parseFloat(insumoQtde) || 0;
        const baseUnit = (insumoObj?.unidade || '').toLowerCase();
        const targetUnit = (insumoUnidade || baseUnit).toLowerCase();

        if (baseUnit === 'kg' && targetUnit === 'g') realQtde = realQtde / 1000;
        if (baseUnit === 'g' && targetUnit === 'kg') realQtde = realQtde * 1000;
        if (baseUnit === 'l' && targetUnit === 'ml') realQtde = realQtde / 1000;
        if (baseUnit === 'ml' && targetUnit === 'l') realQtde = realQtde * 1000;

        if (!editingSaida && insumoObj && realQtde > parseFloat(insumoObj.estoqueAtual)) {
          setNotification({ title: 'Estoque Insuficiente', message: `Você está tentando retirar ${formatBRNumber(realQtde, 3)} ${baseUnit}, mas só possui ${formatBRNumber(insumoObj.estoqueAtual, 3)} em estoque.`, type: 'error' });
          return;
        }

        const payload = {
          insumoId: parseInt(selectedInsumoId),
          quantidade: realQtde,
          status: 'saída'
        };

        const res = await fetch(`/api/saidas/insumos${editingSaida ? '/' + editingSaida.id : ''}`, {
          method: editingSaida ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Erro ao salvar saída de insumo");

        setNotification({ title: 'Sucesso!', message: `Saída de ${insumoObj?.nome || 'insumo'} registrada.`, type: 'success' });
      }

      if (fetchSaidas) await fetchSaidas();
      if (fetchSaidaInsumos) await fetchSaidaInsumos();
      if (fetchProdutos) await fetchProdutos();
      if (fetchInsumos) await fetchInsumos();

      setIsAddModalOpen(false);
      setEditingSaida(null);
      setCliente(''); setProdutoId(''); setQuantidade(''); setValorUnitario(''); setDesconto('0'); setTotal(''); setSelectedInsumoId(''); setInsumoQtde('');
    } catch (e) {
      console.error(e);
      setNotification({ title: 'Erro', message: cleanNotificationMessage(e.message), type: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteAction) return;
    try {
      const endpoint = deleteAction.type === 'produtos' ? 'saidas/produtos' : 'saidas/insumos';
      const res = await fetch(`/api/${endpoint}/${deleteAction.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Erro ao excluir saída");

      if (fetchSaidas) await fetchSaidas();
      if (fetchSaidaInsumos) await fetchSaidaInsumos();
      if (fetchProdutos) await fetchProdutos();
      if (fetchInsumos) await fetchInsumos();

      setNotification({ title: 'Excluído!', message: 'O registro foi removido e o estoque ajustado.', type: 'info' });
      setShowDeleteModal(false);
      setDeleteAction(null);
      setIsAddModalOpen(false);
    } catch (e) {
      console.error(e);
      setNotification({ title: 'Erro', message: cleanNotificationMessage(e.message), type: 'error' });
    }
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
               <div className="w-[100px] text-center">Desconto</div>
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
                   <div className="w-[80px] text-center text-[#0D0D0D]">{saida.id || '-'}</div>
                   <div className="flex-1 text-left px-4 text-[#0D0D0D] font-semibold uppercase">{saida.cliente || '-'}</div>
                   <div className="flex-1 text-left px-4 truncate uppercase">{saida.produto || '-'}</div>
                    <div className="w-[80px] text-center">{saida.qtde || '-'}</div>
                    <div className="w-[100px] text-center text-red-500 font-bold">{saida.desconto > 0 ? `- R$ ${Number(saida.desconto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</div>
                    <div className="w-[110px] text-center font-bold text-[#F84910]">{saida.total || '0,00'}</div>
                   <div className="w-[110px] text-center">{saida.data || '-'}</div>
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
               <div className="w-[80px] text-center">Código</div>
               <div className="flex-1 text-left px-4">Insumo</div>
               <div className="w-[100px] text-center">Quantidade</div>
               <div className="w-[120px] text-center">Status</div>
               <div className="w-[110px] text-center">Data</div>
               <div className="w-[80px] text-center">Ações</div>
            </div>
            {paginatedSaidaInsumos.map((entry, idx) => (
              <div key={entry.id} className="flex h-[50px] w-full items-center justify-between rounded-lg bg-white px-4 font-inter text-xs font-medium text-[#606060] transition-fluid hover:bg-slate-50 border-b border-[#F0F0F3] last:border-0 anim-slide-up">
                <div className="w-[80px] text-center text-[#0D0D0D] font-medium">{entry.id || '-'}</div>
                <div className="flex-1 text-left px-4 text-[#0D0D0D] font-semibold uppercase">{entry.nome || '-'}</div>
                <div className="w-[100px] text-center font-bold text-red-500">-{entry.qtde || '-'}</div>
                <div className="w-[120px] flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    entry.status === 'entregue' ? 'bg-green-100 text-green-600' :
                    entry.status === 'enviado' ? 'bg-blue-100 text-blue-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {entry.status || '-'}
                  </span>
                </div>
                <div className="w-[110px] text-center">{entry.data || '-'}</div>
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

            <div className="flex h-[40px] w-full items-center justify-between border-b border-[#F0F0F3] pb-4 mb-2">
              <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">
                {editingSaida ? 'Editar Registro / Saída' : 'Adicionar Nova Saída'}
              </h3>
              <button onClick={() => { setIsAddModalOpen(false); clearForm(); }} className="flex size-8 items-center justify-center rounded-full text-[#606060] hover:bg-gray-100 transition-fluid hover:rotate-90">
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
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm">
                      <option value="pendente">Pendente</option>
                      <option value="enviado">Enviado</option>
                      <option value="entregue">Entregue</option>
                    </select>
                  </div>

                  <div className="flex gap-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100/50">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="font-plus-jakarta text-[10px] font-bold text-[#F84910] uppercase tracking-wider">Preço Unit. (R$)</label>
                      <input type="number" step="0.01" value={valorUnitario} onChange={e => setValorUnitario(e.target.value)} className="h-10 w-full rounded-lg border border-orange-200 bg-white px-3 text-sm font-bold text-[#0D0D0D]" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="font-plus-jakarta text-[10px] font-bold text-red-500 uppercase tracking-wider">Desconto (R$)</label>
                      <input type="number" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} className="h-10 w-full rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-600" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="font-plus-jakarta text-[10px] font-bold text-[#606060] uppercase tracking-wider">Total Final</label>
                      <div className="h-10 w-full flex items-center px-3 rounded-lg bg-white border border-gray-200 font-bold text-[#F84910]">
                        R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Escolher Insumo para Baixa</label>
                  <select 
                    value={selectedInsumoId} 
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedInsumoId(id);
                      const ins = insumosList.find(i => String(i.id) === String(id));
                      if (ins) setInsumoUnidade(ins.unidade);
                    }} 
                    className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {insumosList.map(i => <option key={i.id} value={i.id}>{(i.nome.charAt(0).toUpperCase() + i.nome.slice(1))} (Estoque: {Number(i.estoqueAtual).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {i.unidade})</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Quantidade</label>
                    <input 
                      type="number" 
                      step="any" 
                      value={insumoQtde} 
                      onChange={e => setInsumoQtde(e.target.value)} 
                      className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm" 
                      placeholder="0.00"
                    />
                  </div>
                  <div className="w-[140px] flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Unidade</label>
                    <select 
                      value={insumoUnidade} 
                      onChange={e => setInsumoUnidade(e.target.value)} 
                      className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 text-sm"
                    >
                      {(() => {
                        const ins = insumosList.find(i => String(i.id) === String(selectedInsumoId));
                        const base = (ins?.unidade || '').toLowerCase();
                        if (base === 'kg' || base === 'g') return (
                          <>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </>
                        );
                        if (base === 'l' || base === 'ml') return (
                          <>
                            <option value="L">L</option>
                            <option value="ml">ml</option>
                          </>
                        );
                        return <option value={ins?.unidade || 'unid'}>{ins?.unidade || 'unid'}</option>;
                      })()}
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
                onClick={confirmDelete} 
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
