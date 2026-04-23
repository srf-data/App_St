import React, { useState, useEffect } from 'react';
import { productSchema, formatZodError } from './utils/validators';

export default function Produtos({ 
  produtosList, setProdutosList, insumosList, fornecedoresList, entradasList, setEntradasList, saidasList, setSaidasList, isAddModalOpen, setIsAddModalOpen, searchQuery, dashboardFilter, clearFilter 
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [editingProduto, setEditingProduto] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [insumoIndexToDelete, setInsumoIndexToDelete] = useState(null);

  // Escape key listener for modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingProduto(null);
        setSelectedProduto(null);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setIsAddModalOpen]);
  
  const today = new Date().toLocaleDateString('pt-BR');

  // New Product Form States
  const [nomeProduto, setNomeProduto] = useState('');
  const [qtdeInicial, setQtdeInicial] = useState('0');
  const [insumosAdicionados, setInsumosAdicionados] = useState([]);
  
  // Add Insumo Selection State
  const [curInsumoId, setCurInsumoId] = useState('');
  const [curInsumoQtde, setCurInsumoQtde] = useState('1');
  const [curInsumoUnidade, setCurInsumoUnidade] = useState('');
  const [curInsumoPreco, setCurInsumoPreco] = useState('');

  // Custom unit filtering logic
  const getCompatibleUnits = (baseUnit) => {
    if (!baseUnit) return [];
    const b = baseUnit.toLowerCase();
    if (b === 'kg' || b === 'g' || b === 'grama') return ['kg', 'g', 'grama'];
    if (b === 'l' || b === 'litro' || b === 'ml') return ['L', 'litro', 'ml'];
    if (b === '100ml' || b === 'ml') return ['100ml', 'ml'];
    if (b === 'unid' || b === 'unidade') return ['unid', 'unidade'];
    return [baseUnit];
  };

  const availableUnits = getCompatibleUnits(insumosList.find(i => i.id.toString() === curInsumoId)?.unidade);

  // Notification State
  const [notification, setNotification] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const ITEMS_PER_PAGE = 20;

  // Refined filtering and sorting
  const filteredProdutos = produtosList.filter(p => 
    p.nome.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    p.id.toString().includes(searchQuery || '')
  );

  const sortedProdutos = [...filteredProdutos].sort((a, b) => {
    if (dashboardFilter === 'hoje') {
      const isAHoje = a.dataCad === today;
      const isBHoje = b.dataCad === today;
      if (isAHoje && !isBHoje) return -1;
      if (!isAHoje && isBHoje) return 1;
    }
    return b.id - a.id; // Default sort by ID descending
  });

  const totalPages = Math.ceil(sortedProdutos.length / ITEMS_PER_PAGE) || 1;
  const paginatedProdutos = sortedProdutos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getDynamicCostNum = (produto) => {
    if (!produto.insumos || !Array.isArray(produto.insumos)) {
      return parseFloat(String(produto.custo || '0').replace('R$', '').replace('.', '').replace(',', '.')) || 0;
    }
    return produto.insumos.reduce((total, item) => {
      const currentInsumo = insumosList.find(i => i.id.toString() === item.id.toString());
      const priceToUse = currentInsumo ? currentInsumo.custoUnitario : (item.custoUnitario || 0);
      return total + (item.qtde * priceToUse);
    }, 0);
  };

  const handleAddInsumo = () => {
    if (!curInsumoId) return;
    const requestedQtde = parseFloat(curInsumoQtde) || 1;
    if (requestedQtde <= 0) return;
    const insumo = insumosList.find(i => i.id.toString() === curInsumoId);
    if (insumo) {
      const selectedPrice = curInsumoPreco ? parseFloat(curInsumoPreco) : insumo.custoUnitario;
      const usageUnit = curInsumoUnidade || insumo.unidade;
      
      // Conversion logic
      let conversionFactor = 1;
      const baseUnit = insumo.unidade.toLowerCase();
      const uUnit = usageUnit.toLowerCase();
      
      if (baseUnit === 'kg' && uUnit === 'g') conversionFactor = 0.001;
      else if (baseUnit === 'l' && uUnit === 'ml') conversionFactor = 0.001;
      else if (baseUnit === 'litro' && uUnit === 'ml') conversionFactor = 0.001;
      else if (baseUnit === '100ml' && uUnit === 'ml') conversionFactor = 0.01;
      else if (baseUnit === 'g' && uUnit === 'kg') conversionFactor = 1000;
      
      const qtdeNaUnidadeBase = requestedQtde * conversionFactor;

      if (qtdeNaUnidadeBase > (insumo.estoqueAtual || 0)) {
        setNotification({ title: 'Limite de Estoque Excedido', message: `A quantidade de ${requestedQtde} ${usageUnit} ultrapassa a capacidade máxima em estoque do insumo ${insumo.nome} (${insumo.estoqueAtual} ${insumo.unidade}).` });
        return;
      }
      
      const adjustedCost = selectedPrice * conversionFactor;
      
      setInsumosAdicionados([...insumosAdicionados, { 
        ...insumo, 
        qtde: requestedQtde, 
        unidade: usageUnit, 
        custoUnitario: adjustedCost,
        originalUnit: insumo.unidade,
        originalPrice: selectedPrice,
        fatorConversao: conversionFactor,
        qtdeNaUnidadeBase: qtdeNaUnidadeBase
      }]);
      setCurInsumoId(''); setCurInsumoQtde('1'); setCurInsumoUnidade(''); setCurInsumoPreco(''); setNotification(null);
    }
  };

  const updateInsumoQtde = (index, delta) => {
    const newList = [...insumosAdicionados];
    const newQtde = newList[index].qtde + delta;
    if (newQtde <= 0) return;
    
    const factor = newList[index].fatorConversao || 1;
    const qtdeNaUnidadeBase = newQtde * factor;

    if (qtdeNaUnidadeBase > (newList[index].estoqueAtual || 0)) {
      setNotification({ title: 'Limite de Estoque Excedido', message: `A quantidade de ${newQtde} ${newList[index].unidade} ultrapassa a capacidade máxima em estoque do insumo ${newList[index].nome} (${newList[index].estoqueAtual} ${newList[index].originalUnit || newList[index].unidade}).` });
      return;
    }
    newList[index].qtde = newQtde; 
    newList[index].qtdeNaUnidadeBase = qtdeNaUnidadeBase;
    setInsumosAdicionados(newList); 
    setNotification(null);
  };

  const removeInsumo = (index) => {
    setInsumoIndexToDelete(index);
    setShowDeleteModal(true);
  };

  const confirmRemoveInsumo = () => {
    setInsumosAdicionados(insumosAdicionados.filter((_, i) => i !== insumoIndexToDelete));
    setShowDeleteModal(false);
    setInsumoIndexToDelete(null);
  };

  const handleSaveProduto = () => {
    const dataToValidate = {
      nome: nomeProduto,
      qtd: qtdeInicial,
    };

    const result = productSchema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = formatZodError(result.error);
      setFormErrors(errors);
      setNotification({ 
        title: 'Erro de Validação', 
        message: 'Por favor, corrija os erros do produto.', 
        type: 'error' 
      });
      return;
    }

    setFormErrors({});
    const totalCusto = insumosAdicionados.reduce((sum, i) => sum + (i.qtde * i.custoUnitario), 0);
    const vendaSugerida = totalCusto * 2.2; // Custo + 120%
    const qtdNum = parseFloat(qtdeInicial) || 0;
    
    if (editingProduto) {
      setProdutosList(produtosList.map(p => p.id === editingProduto.id ? { 
        ...p, 
        nome: nomeProduto, 
        custo: `R$ ${totalCusto.toFixed(2).replace('.', ',')}`, 
        venda: `R$ ${vendaSugerida.toFixed(2).replace('.', ',')}`,
        insumos: insumosAdicionados 
      } : p));
      setNotification({ title: 'Sucesso!', message: 'Produto atualizado com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      setEditingProduto(null);
    } else {
      const newId = Math.max(0, ...produtosList.map(p => p.id)) + 1;
      const newProduto = { 
        id: newId, 
        nome: nomeProduto, 
        receita: 'Verificar', 
        qtd: qtdNum, 
        custo: `R$ ${totalCusto.toFixed(2).replace('.', ',')}`, 
        venda: `R$ ${vendaSugerida.toFixed(2).replace('.', ',')}`, 
        dataCad: today,
        insumos: insumosAdicionados 
      };

      if (qtdNum > 0) {
        const newEntrada = {
          id: String(newId), 
          razao: nomeProduto,
          fornecedor: 'Produção Própria',
          valor: totalCusto.toFixed(2).replace('.', ','),
          desconto: '0,00',
          total: (totalCusto * qtdNum).toFixed(2).replace('.', ','),
          emissao: today,
          entrada: today,
          cadastro: today,
          status: 'concluida',
          qtde: qtdNum
        };
        setEntradasList(prev => [newEntrada, ...prev]);
      }

      setProdutosList([newProduto, ...produtosList]);
      setNotification({ title: 'Sucesso!', message: 'Produto cadastrado com sucesso!', type: 'success' });
      setTimeout(() => { setNotification(null); setIsAddModalOpen(false); }, 1500);
    }
    setNomeProduto(''); setQtdeInicial('0'); setInsumosAdicionados([]);
  };

  const handleDeleteProduct = (produto) => {
    setProductToDelete(produto);
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    
    // 1. Remover o produto da lista
    setProdutosList(produtosList.filter(p => p.id !== productToDelete.id));
    
    // 2. Remover registros relacionados em Entradas
    if (setEntradasList) {
      setEntradasList(prev => prev.filter(e => e.razao !== productToDelete.nome));
    }
    
    // 3. Remover registros relacionados em Saídas
    if (setSaidasList) {
      setSaidasList(prev => prev.filter(s => s.produto !== productToDelete.nome));
    }
    
    setNotification({ title: 'Excluído!', message: 'O produto foi removido com sucesso.', type: 'info' });
    setTimeout(() => setNotification(null), 3000);
    setShowDeleteModal(false);
    setProductToDelete(null);
    setEditingProduto(null);
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (produto) => {
    setEditingProduto(produto); 
    setNomeProduto(produto.nome);
    setQtdeInicial(produto.qtd || 0);
    setInsumosAdicionados(produto.insumos || []); 
    setFormErrors({});
  };

  const isFormValid = nomeProduto.trim().length > 0;

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-lg border border-[#F0F0F3] bg-white p-2.5 shadow-[0_0_20px_rgba(139,139,139,0.03)] transition-all overflow-x-auto table-scrollbar relative">
      
      {/* Active Filter Badge */}
      {dashboardFilter === 'hoje' && (
        <div className="flex items-center gap-3 px-2 mb-1 animate-in slide-in-from-left duration-300">
           <div className="flex items-center gap-2 rounded-full bg-[rgba(54,186,111,0.1)] px-3 py-1 border border-[rgba(54,186,111,0.2)]">
              <span className="font-plus-jakarta text-[11px] font-bold text-[#36BA6F]">Exibindo: Novos Produtos (Hoje)</span>
              <button onClick={clearFilter} className="flex size-4 items-center justify-center rounded-full bg-[#36BA6F] text-white hover:bg-green-600 transition cursor-pointer">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
           </div>
        </div>
      )}

      <div className="min-w-[1020px] flex flex-col gap-2.5">
        {/* Table Header */}
        <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
          <div className="w-[80px] text-center">Código</div>
          <div className="flex-1 w-[auto] max-w-none text-left px-4">Nome do Produto</div>
          <div className="w-[120px] text-center">Receita (Cálculo)</div>
          <div className="w-[130px] text-center">Quant. Cadastrada</div>
          <div className="w-[110px] text-center">Custo Prod.</div>
          <div className="w-[100px] text-center">Preço Venda</div>
          <div className="w-[100px] text-center">Lucro (%)</div>
          <div className="w-[80px] text-center">Ações</div>
        </div>

        {/* List of Products */}
        {paginatedProdutos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border border-[#F0F0F3] my-4 anim-fade-in gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(248,73,16,0.08)] text-[#F84910]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <h3 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Nenhum produto encontrado</h3>
              <p className="font-inter text-sm text-[#606060] max-w-[320px] mt-1">
                Não há registros de produtos cadastrados de acordo com os filtros. Adicione um novo item para começar.
              </p>
            </div>
          </div>
        ) : (
          paginatedProdutos.map((produto, idx) => {
            const isHoy = produto.dataCad === today && dashboardFilter === 'hoje';
            return (
              <div 
                key={produto.id} 
                className={`flex h-[50px] w-full items-center justify-between rounded-lg px-4 font-inter text-xs font-medium text-[#606060] transition-fluid hover:bg-slate-50 border-b border-[#F0F0F3] last:border-0 relative anim-slide-up 
                  ${isHoy ? 'bg-[rgba(54,186,111,0.05)] border-l-4 border-l-[#36BA6F]' : 'bg-white'}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="w-[80px] text-center text-[#0D0D0D] flex items-center justify-center gap-1">
                  {isHoy && <div className="size-2 rounded-full bg-[#36BA6F] animate-pulse" />}
                  {produto.id}
                </div>
                
                <div className="flex-1 w-[auto] max-w-none text-left px-4 truncate text-[#0D0D0D] font-semibold">{produto.nome || '-'}</div>
                
                <div className="w-[120px] flex justify-center">
                  <button 
                    onClick={() => setSelectedProduto(produto)}
                    className="flex h-[23px] px-2 items-center justify-center gap-2 rounded-lg bg-[rgba(248,73,16,0.1)] text-[#F84910] transition-fluid hover:bg-[#F84910] hover:text-white cursor-pointer hover-scale"
                  >
                    <span className="font-inter text-xs font-medium">{produto.insumos && produto.insumos.length > 0 ? `${produto.insumos.length} Insumo${produto.insumos.length > 1 ? 's' : ''}` : 'Verificar'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </button>
                </div>
                
                <div className="w-[130px] text-center">{produto.qtd || '-'}</div>
                <div className="w-[110px] text-center font-medium">
                  {(() => {
                    const dynamicCost = getDynamicCostNum(produto);
                    const savedCost = parseFloat(String(produto.custo).replace('R$', '').replace('.', '').replace(',', '.')) || 0;
                    const isLower = dynamicCost < (savedCost - 0.01);
                    return (
                      <div className="flex flex-col items-center">
                        <span className={isLower ? 'text-[#36BA6F] font-bold' : ''}>R$ {dynamicCost.toFixed(2).replace('.', ',')}</span>
                        {isLower && <span className="text-[9px] uppercase font-bold text-[#36BA6F] leading-none">Promoção!</span>}
                      </div>
                    );
                  })()}
                </div>
                <div className="w-[100px] text-center text-[#36BA6F] font-semibold">{produto.venda || '-'}</div>
                <div className="w-[100px] text-center">
                  {(() => {
                    const c = getDynamicCostNum(produto);
                    const v = parseFloat(String(produto.venda).replace('R$', '').replace('.', '').replace(',', '.')) || 0;
                    const p = v > 0 ? (((v - c) / v) * 100).toFixed(1) : 0;
                    return <span className={`font-bold ${p > 30 ? 'text-[#36BA6F]' : p > 15 ? 'text-blue-500' : 'text-amber-500'}`}>{p}%</span>;
                  })()}
                </div>
                <div className="w-[80px] flex justify-center">
                    <button 
                      onClick={() => handleOpenEdit(produto)}
                      className="flex size-7 items-center justify-center rounded-lg bg-[#D7D7D740] text-[#606060] hover:bg-[#F84910] hover:text-white transition-fluid cursor-pointer hover-scale"
                      title="Editar Produto"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                 </div>
              </div>
            );
          })
        )}

        {/* Footer Paginação */}
        <div className="flex h-[48px] w-full items-center justify-between border-t border-[#F0F0F3] px-2 pt-2 mt-2">
          <div className="font-inter text-xs font-medium text-[#606060]">
            {sortedProdutos.length} registros encontrados. Página {currentPage} de {totalPages}
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

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in" onMouseDown={() => setShowDeleteModal(false)}>
          <div className="relative flex w-full max-w-[380px] flex-col items-center gap-5 rounded-xl border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300" onMouseDown={e => e.stopPropagation()}>
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
            </div>
            <div className="text-center">
              <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">Tem certeza?</h3>
              <p className="font-inter text-sm text-[#606060] mt-1">
                {productToDelete 
                  ? `Esta ação removerá permanentemente o produto "${productToDelete.nome}" e todo o seu histórico de entradas e saídas.`
                  : "Deseja realmente remover este insumo da receita deste produto?"}
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-11 rounded-lg bg-gray-100 font-plus-jakarta text-sm font-bold text-[#606060] hover:bg-gray-200 transition-fluid cursor-pointer">Cancelar</button>
              <button 
                onClick={productToDelete ? confirmDeleteProduct : confirmRemoveInsumo} 
                className="flex-1 h-11 rounded-lg bg-[#BA0000] font-plus-jakarta text-sm font-bold text-white hover:bg-red-700 transition-fluid shadow-md hover-scale cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES MODAL */}
      {selectedProduto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-[2px] p-4 anim-fade-in"
          onMouseDown={() => setSelectedProduto(null)}
        >
          <div 
            className="relative flex w-full max-w-[632px] flex-col gap-4 rounded-lg border border-[#F0F0F3] bg-white p-4 shadow-xl animate-in zoom-in-95 duration-300"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex h-[50px] w-full items-center justify-between border-b border-[#F0F0F3] pb-2">
              <h3 className="font-plus-jakarta text-sm font-semibold text-[#0D0D0D]">Cálculo de Custo de Produção</h3>
              <button onClick={() => setSelectedProduto(null)} className="flex size-6 items-center justify-center rounded-full text-[#606060] hover:bg-gray-100 transition-fluid cursor-pointer hover:rotate-90">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="flex w-full items-center gap-4 px-4 text-left">
               <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(248,73,16,0.1)] text-[#F84910]">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
               </div>
               <div className="flex flex-col gap-1">
                 <h4 className="font-plus-jakarta text-sm font-semibold text-[#0D0D0D]">{selectedProduto.nome}</h4>
                 <span className="font-plus-jakarta text-xs font-medium text-[#F84910]">Cód. {selectedProduto.id}</span>
               </div>
            </div>

            <div className="mt-2 flex w-full flex-col px-4 text-left">
              <h5 className="font-plus-jakarta text-base font-bold text-[#0D0D0D] mb-4">Receita (Lista de Insumos)</h5>
              
              <div className="flex flex-col gap-2 rounded-lg border border-[#F0F0F3] bg-white p-2.5">
                <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
                  <div className="w-[40px] text-center">Cód.</div>
                  <div className="w-[100px] text-left">Insumo</div>
                  <div className="w-[100px] text-center">Quant. Utilizada</div>
                  <div className="w-[140px] text-center">Custo Unitário</div>
                  <div className="w-[100px] text-center">Custo Proporcional</div>
                </div>

                {(selectedProduto.insumos && selectedProduto.insumos.length > 0) ? (
                  selectedProduto.insumos.map((ins, idx) => (
                    <div key={idx} className="flex h-[35px] w-full items-center justify-between px-4 font-inter text-xs font-medium text-[#606060] border-b border-[#F0F0F3] last:border-0 hover:bg-slate-50 transition">
                      <div className="w-[40px] text-center text-[#0D0D0D]">{ins.id}</div>
                      <div className="w-[100px] text-left text-[#0D0D0D] truncate" title={ins.nome}>{ins.nome}</div>
                      <div className="w-[100px] text-center">{ins.qtde} {ins.unidade}</div>
                      <div className="w-[140px] text-center">R$ {ins.originalPrice ? parseFloat(ins.originalPrice).toFixed(2) : (ins.originalUnit ? '?' : '')}/{ins.originalUnit}</div>
                      <div className="w-[100px] text-center">R$ {(ins.qtde * ins.custoUnitario).toFixed(2)}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex w-full items-center justify-center p-4 text-[#606060] text-xs font-medium">Nenhum insumo cadastrado na receita deste produto.</div>
                )}
              </div>
            </div>

            <div className="mt-2 flex w-full items-center justify-end px-4">
              <div className="flex h-[40px] items-center rounded-lg bg-[rgba(54,186,111,0.1)] px-4">
                <span className="font-plus-jakarta text-sm font-semibold text-[#0D0D0D]">
                  Custo de Produção Total: <span className="text-[#36BA6F]">R$ {(selectedProduto.insumos || []).reduce((acc, ins) => acc + (ins.qtde * (ins.custoUnitario || 0)), 0).toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {(isAddModalOpen || editingProduto) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-[2px] p-4 text-left"
          onMouseDown={() => { setIsAddModalOpen(false); setEditingProduto(null); setNomeProduto(''); }}
        >
          <div 
            className="relative flex w-full max-w-[700px] flex-col gap-4 rounded-lg border border-[#F0F0F3] bg-white p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto table-scrollbar"
            onMouseDown={e => e.stopPropagation()}
          >
            
            {notification && (
              <div className={`mb-2 flex items-start gap-3 rounded-lg border p-4 animate-in slide-in-from-top duration-300 ${
                notification.type === 'success' ? 'border-green-100 bg-green-50' : 
                notification.type === 'warning' ? 'border-yellow-100 bg-yellow-50' : 
                notification.type === 'info' ? 'border-blue-100 bg-blue-50' : 
                'border-red-100 bg-red-50'
              }`}>
                <div className={`flex size-5 shrink-0 items-center justify-center rounded-full mt-0.5 text-white ${
                  notification.type === 'success' ? 'bg-green-500' : 
                  notification.type === 'warning' ? 'bg-yellow-500' : 
                  notification.type === 'info' ? 'bg-blue-500' : 
                  'bg-red-500'
                }`}>
                   {notification.type === 'success' ? (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   ) : notification.type === 'warning' ? (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                   ) : notification.type === 'info' ? (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                   ) : (
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                   )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h4 className={`font-plus-jakarta text-sm font-bold ${
                    notification.type === 'success' ? 'text-green-800' : 
                    notification.type === 'warning' ? 'text-yellow-800' : 
                    notification.type === 'info' ? 'text-blue-800' : 
                    'text-red-800'
                  }`}>{notification.title}</h4>
                  <p className={`font-inter text-xs leading-relaxed ${
                    notification.type === 'success' ? 'text-green-600' : 
                    notification.type === 'warning' ? 'text-yellow-600' : 
                    notification.type === 'info' ? 'text-blue-600' : 
                    'text-red-600'
                  }`}>{notification.message}</p>
                </div>
                <button onClick={() => setNotification(null)} className="text-gray-400 hover:bg-gray-100 rounded transition size-6 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
            )}

            <div className="flex h-[50px] w-full items-center justify-between border-b border-[#F0F0F3] pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[rgba(248,73,16,0.1)] text-[#F84910]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-8m0 0V4m0 8h8m-8 0H4"></path></svg>
                </div>
                <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">
                   {editingProduto ? 'Editar Produto' : 'Adicionar Novo Produto'}
                </h3>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingProduto(null); setNomeProduto(''); }}
                className="flex size-8 items-center justify-center rounded-full text-[#606060] hover:bg-gray-100 transition-fluid hover:rotate-90 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-plus-jakarta text-sm font-semibold text-[#606060]">Nome do Produto</label>
                <input type="text" placeholder="Ex: Vela Aromática de Alecrim" value={nomeProduto} onChange={(e) => setNomeProduto(e.target.value)} className={`h-12 w-full rounded-lg border ${formErrors.nome ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[#FAFAFA] px-4 font-inter text-base text-[#0D0D0D] outline-none focus:border-[#F84910] transition-fluid`} />
                {formErrors.nome && <p className="text-xs text-red-500 mt-1">{formErrors.nome}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-plus-jakarta text-sm font-semibold text-[#606060]">
                  {editingProduto ? 'Quantidade Atual (Somente Leitura)' : 'Quantidade Inicial'}
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={qtdeInicial} 
                    onChange={(e) => setQtdeInicial(e.target.value)} 
                    disabled={!!editingProduto}
                    title={editingProduto ? "Para alterar a quantidade, registre uma Produção (Entrada) ou Venda (Saída)" : ""}
                    className={`h-12 w-full rounded-lg border ${formErrors.qtd ? 'border-red-500' : 'border-[#F0F0F3]'} px-4 font-inter text-base text-center outline-none transition-fluid ${editingProduto ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAFAFA] text-[#0D0D0D] focus:border-[#F84910]'}`} 
                  />
                  {editingProduto && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                  )}
                </div>
                {formErrors.qtd && <p className="text-xs text-red-500 mt-1">{formErrors.qtd}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Receita (Lista de Insumos)</h4>
              <div className="flex flex-col gap-2 rounded-lg border border-[#F0F0F3] bg-white p-3 max-h-[250px] overflow-y-auto">
                <div className="min-w-[500px]">
                  <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-[11px] font-medium text-[#606060] mb-2">
                    <div className="w-[40px] text-center">Cód.</div>
                    <div className="flex-1 px-4 text-left">Insumo</div>
                    <div className="w-[80px] text-center">Quant.</div>
                    <div className="w-[80px] text-center">Unidade</div>
                    <div className="w-[100px] text-center">Total</div>
                    <div className="w-[80px] text-center">Ações</div>
                  </div>
                  {insumosAdicionados.map((ins, idx) => (
                    <div key={idx} className="flex h-[45px] w-full items-center justify-between px-4 font-inter text-xs text-[#606060] border-b border-[#F0F0F3] last:border-0 hover:bg-slate-50">
                      <div className="w-[40px] text-center font-bold">{ins.id}</div>
                      <div className="flex-1 px-4 text-left font-bold truncate text-[#0D0D0D]">{ins.nome}</div>
                      <div className="w-[80px] text-center text-[#F84910] font-bold">{ins.qtde}</div>
                      <div className="w-[80px] text-center font-bold text-[#606060]">{ins.unidade}</div>
                      <div className="w-[100px] text-center font-bold text-[#36BA6F]">R$ {(ins.qtde * (ins.custoUnitario || 0)).toFixed(2)}</div>
                      <div className="w-[80px] flex items-center justify-center gap-2">
                         <button onClick={() => updateInsumoQtde(idx, -1)} className="size-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                         <button onClick={() => updateInsumoQtde(idx, 1)} className="size-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                         <button onClick={() => removeInsumo(idx)} className="size-6 bg-red-50 text-red-500 rounded flex items-center justify-center hover:bg-[#BA0000] hover:text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3 rounded-lg bg-[#FAFAFA] p-3 border border-dashed border-[#D7D7D7]">
                <div className="flex-1 min-w-[180px] flex flex-col gap-1">
                   <label className="text-[11px] font-bold text-[#606060]">Escolher Insumo</label>
                   <select 
                     value={curInsumoId} 
                     onChange={(e) => {
                       const id = e.target.value;
                       setCurInsumoId(id);
                       const ins = insumosList.find(i => i.id.toString() === id);
                       if (ins) {
                         setCurInsumoUnidade(ins.unidade);
                         setCurInsumoPreco(ins.custoUnitario.toString());
                       }
                     }} 
                     className="h-9 w-full rounded border border-[#F0F0F3] bg-white px-2 text-xs"
                   >
                     <option value="">Selecione...</option>
                     {insumosList
                       
                        .map(i => (
                          <option key={i.id} value={i.id}>
                            {i.nome} - R$ {(i.custoUnitario || 0).toFixed(2).replace('.', ',')} (Estoque: {Number(i.estoqueAtual).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {i.unidade})
                          </option>
                        ))}
                   </select>
                </div>

                {curInsumoId && (
                  <div className="w-[120px] flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-[#606060]">Escolher Preço</label>
                    <select 
                      value={curInsumoPreco} 
                      onChange={(e) => setCurInsumoPreco(e.target.value)} 
                      className="h-9 w-full rounded border border-[#F0F0F3] bg-white px-2 text-xs"
                    >
                      {insumosList.find(i => i.id.toString() === curInsumoId)?.precos?.map((p, idx) => (
                        <option key={idx} value={p.valor}>R$ {p.valor.toFixed(2)}</option>
                      )) || <option value={insumosList.find(i => i.id.toString() === curInsumoId)?.custoUnitario}>R$ {insumosList.find(i => i.id.toString() === curInsumoId)?.custoUnitario.toFixed(2)}</option>}
                    </select>
                  </div>
                )}

                <div className="w-[80px] flex flex-col gap-1">
                   <label className="text-[11px] font-bold text-[#606060]">Quant.</label>
                   <input 
                     type="number" 
                     step="any"
                     value={curInsumoQtde} 
                     onChange={(e) => setCurInsumoQtde(e.target.value)} 
                     className="h-9 w-full rounded border border-[#F0F0F3] bg-white px-2 text-xs text-center" 
                   />
                </div>

                <div className="w-[80px] flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#606060]">Unidade</label>
                  <select 
                    value={curInsumoUnidade} 
                    onChange={(e) => setCurInsumoUnidade(e.target.value)} 
                    className="h-9 w-full rounded border border-[#F0F0F3] bg-white px-2 text-xs"
                  >
                    {availableUnits.map((u, idx) => <option key={idx} value={u}>{u}</option>)}
                  </select>
                </div>

                <button onClick={handleAddInsumo} className="h-9 bg-[#F84910] text-white px-4 rounded text-xs font-bold hover:opacity-90">Adicionar</button>
              </div>
            </div>

            <div className="mt-8 border-t border-[#F0F0F3] pt-6 flex flex-col gap-6">
              {/* Financial Dashboard Row */}
              <div className="flex flex-wrap items-center justify-start gap-4 bg-[rgba(248,73,16,0.03)] p-5 rounded-xl border border-[rgba(248,73,16,0.08)]">
                <div className="bg-white px-5 h-10 flex items-center rounded-lg border border-[#F0F0F3]">
                  <span className="font-plus-jakarta text-sm font-bold text-[#606060]">Custo Total: <span className="text-[#36BA6F] ml-1">R$ {insumosAdicionados.reduce((sum, i) => sum + (i.qtde * (i.custoUnitario || 0)), 0).toFixed(2).replace('.', ',')}</span></span>
                </div>
                {insumosAdicionados.length > 0 && (
                  <div className="bg-white px-5 h-10 flex items-center rounded-lg border border-[#F0F0F3]">
                    <span className="font-plus-jakarta text-sm font-bold text-[#606060]">
                      Lucro Estimado: <span className="text-[#F84910] ml-1">
                        R$ {(() => {
                          const c = insumosAdicionados.reduce((sum, item) => {
                            const currentInsumo = insumosList.find(i => i.id.toString() === item.id.toString());
                            const priceToUse = currentInsumo ? currentInsumo.custoUnitario : (item.custoUnitario || 0);
                            return sum + (item.qtde * priceToUse);
                          }, 0);
                          const v = c * 2.2;
                          return (v - c).toFixed(2).replace('.', ',');
                        })()}
                      </span>
                      <span className="text-[10px] text-[#A0A0A0] ml-2 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">Markup 2.2x</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-end gap-3 pb-2">
                {editingProduto && (
                  <button 
                    onClick={() => handleDeleteProduct(editingProduto)}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg px-6 font-plus-jakarta text-sm font-bold text-[#BA0000] hover:bg-red-50 transition-fluid cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
                    <span>Remover Produto</span>
                  </button>
                )}
                
                <button 
                  onClick={handleSaveProduto} 
                  className={`h-11 px-10 rounded-lg font-plus-jakarta font-bold text-sm flex items-center gap-2 transition-all shadow-md ${isFormValid ? 'bg-[#36BA6F] text-white hover:scale-105 active:scale-95 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
                >
                  {editingProduto ? 'Salvar Alterações' : 'Salvar Produto'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

