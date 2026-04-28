import React, { useState, useRef, useEffect } from 'react';
import { cleanNotificationMessage, formatBRNumber } from './utils/validators';
import { materialSchema, formatZodError } from './utils/validators';
import { apiFetch } from './utils/api';


export default function MateriasPrimas({ 
  fetchInsumos,
  fetchEntradas,
  fetchProdutos,
  insumosList, 
  setInsumosList, 
  fornecedoresList, 
  entradasList, 
  setEntradasList, 
  saidaInsumosList, 
  setSaidaInsumosList, 
  produtosList = [],
  setProdutosList,
  isAddModalOpen, 
  setIsAddModalOpen, 
  searchQuery,
  dashboardFilter, 
  clearFilter,
  setNotification
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formErrors, setFormErrors] = useState({});
  
  const [nome, setNome] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [unidade, setUnidade] = useState('');
  const [custo, setCusto] = useState('');
  const [estoque, setEstoque] = useState('');
  const [tamanhoEmbalagem, setTamanhoEmbalagem] = useState('1');
  const [imagem, setImagem] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  const fileInputRef = React.useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        clearForm();
        setHistoryItem(null);
        setZoomedImage(null);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setIsAddModalOpen]);

  const ITEMS_PER_PAGE = 20;

  const filteredInsumos = insumosList.filter(i => 
    i.nome.toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (i.fornecedor || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    i.id.toString().includes(searchQuery || '')
  );

  const filteredByDashboard = [...filteredInsumos].filter(i => {
    if (dashboardFilter === 'minimo') return i.estoqueAtual > 0 && i.estoqueAtual <= 5;
    if (dashboardFilter === 'zerado') return i.estoqueAtual <= 0;
    return true;
  });

  const sortedInsumos = [...filteredByDashboard].sort((a, b) => b.id - a.id);

  const totalPages = Math.ceil(sortedInsumos.length / ITEMS_PER_PAGE) || 1;
  const paginatedInsumos = sortedInsumos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSaveMateriaPrima = async () => {
    if (loading) return;
    setLoading(true);
    const dataToValidate = {
      nome,
      fornecedorId,
      unidade,
      custo: custo.replace(',', '.'),
      estoque: estoque,
    };

    const result = materialSchema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = formatZodError(result.error);
      setFormErrors(errors);
      setNotification({ 
        title: 'Erro de Validação', 
        message: 'Por favor, corrija os campos destacados.', 
        type: 'error' 
      });
      return;
    }

    setFormErrors({});
    const valorNumerico = parseFloat(custo.replace(',', '.')) || 0;
    const estoqueNum = parseFloat(estoque) || 0;
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const fornecedor = (fornecedoresList || []).find(f => String(f.id) === String(fornecedorId))?.fantasia || '';

    const payload = {
        nome,
        unidade,
        custoUnitario: valorNumerico,
        precoEmbalagem: valorNumerico,
        tamanhoEmbalagem: parseFloat(tamanhoEmbalagem) || 1,
        estoqueAtual: estoqueNum,
        fornecedorId,
        foto: imagePreview
    };

    try {
      if (editingItem) {
        const res = await apiFetch(`/api/insumos/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setNotification({ title: 'Sucesso!', message: 'Matéria-prima atualizada com sucesso!', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
          setEditingItem(null);
          if (fetchInsumos) await fetchInsumos();
          if (fetchProdutos) await fetchProdutos();
        } else {
          const errorData = await res.json();
          setNotification({ title: 'Erro', message: errorData.error || res.statusText, type: 'error' });
        }
      } else {
        const res = await apiFetch('/api/insumos', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          if (estoqueNum > 0 && fetchEntradas) await fetchEntradas();

          setNotification({ title: 'Sucesso!', message: 'Matéria-prima cadastrada com sucesso!', type: 'success' });
          setTimeout(() => { setNotification(null); setIsAddModalOpen(false); }, 1500);
          if (fetchInsumos) await fetchInsumos();
          if (fetchProdutos) await fetchProdutos();
        } else {
          const errorData = await res.json();
          setNotification({ title: 'Erro', message: errorData.error || res.statusText, type: 'error' });
        }
      }
    } catch (e) {
      console.error(e);
      setNotification({ title: 'Erro', message: cleanNotificationMessage(e.message) || 'Falha na comunicação com o servidor', type: 'error' });
    } finally {
      setLoading(false);
    }

    setNome(''); setFornecedorId(''); setUnidade(''); setCusto(''); setEstoque(''); setTamanhoEmbalagem('1'); setImagem(null); setImagePreview(null);
  };

  const clearForm = () => {
    setNome(''); setFornecedorId(''); setUnidade(''); setCusto(''); setEstoque(''); setTamanhoEmbalagem('1'); setImagem(null); setImagePreview(null);
    setEditingItem(null);
    setFormErrors({});
  };

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const res = await apiFetch(`/api/insumos/${itemToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (fetchInsumos) await fetchInsumos();
        if (fetchProdutos) await fetchProdutos();

        if (setEntradasList) setEntradasList(prev => prev.filter(e => e.razao !== itemToDelete.nome));
        if (setSaidaInsumosList) setSaidaInsumosList(prev => prev.filter(s => s.nome !== itemToDelete.nome));
        
        if (setProdutosList) {
          setProdutosList(prev => prev.map(p => ({
            ...p,
            insumos: (p.insumos || []).filter(ins => ins.id !== itemToDelete.id)
          })));
        }

        setNotification({ title: 'Excluído!', message: 'A matéria-prima foi removida com sucesso.', type: 'info' });
        setTimeout(() => setNotification(null), 3000);
        setShowDeleteModal(false);
        setItemToDelete(null);
        setEditingItem(null);
        setIsAddModalOpen(false);
      }
    } catch(e) {
      console.error(e);
      setNotification({ title: 'Erro', message: cleanNotificationMessage(e.message) || 'Falha ao deletar Insumo', type: 'error' });
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setNotification({ title: 'Erro', message: 'Por favor, selecione um arquivo de imagem.', type: 'error' });
        return;
      }

      const MAX_SIZE = 10 * 1024 * 1024; 
      if (file.size > MAX_SIZE) {
        setNotification({ 
          title: 'Arquivo Muito Grande', 
          message: 'A imagem deve ter no máximo 10MB. Por favor, escolha uma imagem menor.', 
          type: 'error' 
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item); 
    setNome(item.nome);
    const foundForn = (fornecedoresList || []).find(f => f.fantasia === item.fornecedor);
    setFornecedorId(foundForn ? String(foundForn.id) : '');
    setUnidade(item.unidade); 
    
    
    setCusto(item.precoEmbalagem ? item.precoEmbalagem.toString().replace('.', ',') : item.custoUnitario.toString().replace('.', ','));
    setTamanhoEmbalagem(item.tamanhoEmbalagem ? item.tamanhoEmbalagem.toString() : "1");
    
    setEstoque(item.estoqueAtual.toString());
    setImagePreview(item.foto || null);
    setFormErrors({});
  };

  const isFormValid = nome.trim() && fornecedorId && unidade.trim() && custo && estoque;

  const getFilterConfig = () => {
    if (dashboardFilter === 'minimo') return { label: 'Estoque Mínimo (Crítico)', color: '#F84910', bg: 'rgba(248,73,16,0.1)' };
    if (dashboardFilter === 'zerado') return { label: 'Estoque Zerado', color: '#BA0000', bg: 'rgba(186,0,0,0.1)' };
    return null;
  };
  const filterConfig = getFilterConfig();

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-lg border border-[#F0F0F3] bg-white p-2.5 shadow-[0_0_20px_rgba(139,139,139,0.03)] transition-all overflow-x-auto table-scrollbar relative">
      
      {}
      {filterConfig && (
        <div className="flex items-center gap-3 px-2 mb-1 animate-in slide-in-from-left duration-300">
           <div className={`flex items-center gap-2 rounded-full px-3 py-1 border`} style={{ backgroundColor: filterConfig.bg, borderColor: filterConfig.color + '33' }}>
              <span className="font-plus-jakarta text-[11px] font-bold" style={{ color: filterConfig.color }}>Prioridade: {filterConfig.label}</span>
              <button 
                onClick={clearFilter} 
                className="flex size-4 items-center justify-center rounded-full text-white hover:opacity-80 transition cursor-pointer"
                style={{ backgroundColor: filterConfig.color }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
           </div>
        </div>
      )}

      <div className="min-w-[1020px] flex flex-col gap-2.5">
        {}
        <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
          <div className="w-[80px] text-center">Código</div>
          <div className="flex-1 w-[auto] max-w-none text-left px-4">Matéria-Prima</div>
          <div className="flex-1 w-[auto] max-w-none text-left px-4">Fornecedor</div>
          <div className="w-[90px] text-center">Unidade</div>
          <div className="w-[120px] text-center">Custo Unit. (Líq.)</div>
          <div className="w-[110px] text-center">Estoque Atual</div>
          <div className="w-[40px] text-center">Foto</div>
          <div className="w-[80px] text-center">Ações</div>
        </div>

        {}
        {paginatedInsumos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border border-[#F0F0F3] my-4 anim-fade-in gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(248,73,16,0.08)] text-[#F84910]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div>
              <h3 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Nenhuma matéria-prima encontrada</h3>
              <p className="font-inter text-sm text-[#606060] max-w-[320px] mt-1">
                Ainda não há registros de matérias-primas cadastradas de acordo com os filtros. Adicione um novo item para começar.
              </p>
            </div>
          </div>
        ) : (
          paginatedInsumos.map((insumo, idx) => {
            const isMin = dashboardFilter === 'minimo' && insumo.estoqueAtual > 0 && insumo.estoqueAtual <= 5;
            const isZer = dashboardFilter === 'zerado' && insumo.estoqueAtual === 0;
            
            let rowClass = "bg-white";
            let borderClass = "border-[#F0F0F3]";
            
            if (isMin) {
              rowClass = "bg-[rgba(248,73,16,0.04)]";
              borderClass = "border-l-4 border-l-[#F84910] border-b-[#F8491022]";
            } else if (isZer) {
              rowClass = "bg-[rgba(186,0,0,0.04)]";
              borderClass = "border-l-4 border-l-[#BA0000] border-b-[#BA000022]";
            }

            return (
              <div 
                key={insumo.id} 
                className={`flex h-[50px] w-full items-center justify-between rounded-lg px-4 font-inter text-xs font-medium text-[#606060] transition-fluid hover:bg-slate-50 border-b last:border-0 relative anim-slide-up ${rowClass} ${borderClass}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="w-[80px] text-center text-[#0D0D0D] flex items-center justify-center gap-1">
                  {(isMin || isZer) && <div className="size-2 rounded-full animate-pulse" style={{ backgroundColor: isMin ? '#F84910' : '#BA0000' }} />}
                  {insumo.id}
                </div>
                <div className="flex-1 w-[auto] max-w-none text-left px-4 truncate text-[#0D0D0D] font-semibold uppercase">{insumo.nome || '-'}</div>
                <div className="flex-1 w-[auto] max-w-none text-left px-4 truncate">{insumo.fornecedor || '-'}</div>
                <div className="w-[90px] text-center">{insumo.unidade || '-'}</div>
                <div className="w-[120px] text-center font-bold text-[#606060] flex flex-col items-center justify-center leading-tight group relative">
                  <span className="cursor-pointer hover:text-[#F84910] transition-fluid" onClick={() => setHistoryItem(insumo)}>
                    R$ {insumo.custoUnitario.toFixed(2).replace('.', ',')}
                  </span>
                  {insumo.precos && insumo.precos.length > 1 && (
                    <button 
                      onClick={() => setHistoryItem(insumo)}
                      className="text-[9px] text-[#F84910] font-medium bg-[#F8491010] px-1.5 rounded-full mt-0.5 hover:bg-[#F8491020] transition-fluid cursor-pointer"
                    >
                      +{insumo.precos.length - 1} preços
                    </button>
                  )}
                </div>
                <div className={`w-[110px] text-center font-bold py-1 rounded-md ${insumo.estoqueAtual <= 0 ? 'text-[#BA0000] bg-red-50' : insumo.estoqueAtual <= 5 ? 'text-[#F84910] bg-orange-50' : 'text-[#36BA6F] bg-[rgba(54,186,111,0.05)]'}`}>
                  {insumo.estoqueAtual !== undefined && insumo.estoqueAtual !== null ? `${Number(insumo.estoqueAtual).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${insumo.unidade || ''}` : '-'}
                </div>
                <div className="w-[40px] flex justify-center">
                   {insumo.foto ? (
                     <button 
                       onClick={() => setZoomedImage(insumo.foto)}
                       className="flex size-8 items-center justify-center rounded-lg bg-orange-50 text-[#F84910] hover:bg-[#F84910] hover:text-white transition-all duration-300 cursor-pointer shadow-sm group"
                       title="Visualizar Foto"
                     >
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                         <line x1="7" y1="17" x2="17" y2="7"></line>
                         <polyline points="7 7 17 7 17 17"></polyline>
                       </svg>
                     </button>
                   ) : (
                     <div className="size-1.5 rounded-full bg-gray-200" title="Sem foto" />
                   )}
                </div>
                <div className="w-[80px] flex justify-center">
                    <button 
                      onClick={() => handleOpenEdit(insumo)}
                      className="flex size-7 items-center justify-center rounded-lg bg-[#D7D7D740] text-[#606060] hover:bg-[#F84910] hover:text-white transition-fluid cursor-pointer hover-scale"
                      title="Editar Matéria-Prima"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                 </div>
              </div>
            );
          })
        )}

        {}
        <div className="flex h-[48px] w-full items-center justify-between border-t border-[#F0F0F3] px-2 pt-2 mt-2">
          <div className="font-inter text-xs font-medium text-[#606060]">
            {sortedInsumos.length} registros encontrados. Página {currentPage} de {totalPages}
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

      {}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in" onMouseDown={() => setShowDeleteModal(false)}>
          <div className="relative flex w-full max-w-[380px] flex-col items-center gap-5 rounded-xl border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300" onMouseDown={e => e.stopPropagation()}>
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
            </div>
            <div className="text-center">
              <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">Tem certeza?</h3>
              <p className="font-inter text-sm text-[#606060] mt-1">
                Esta ação removerá permanentemente a matéria-prima "{(itemToDelete?.nome || '').toUpperCase()}" e todo o seu histórico de entradas e saídas.
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-11 rounded-lg bg-gray-100 font-plus-jakarta text-sm font-bold text-[#606060] hover:bg-gray-200 transition-fluid cursor-pointer">Cancelar</button>
              <button onClick={confirmDeleteItem} className="flex-1 h-11 rounded-lg bg-[#BA0000] font-plus-jakarta text-sm font-bold text-white hover:bg-red-700 transition-fluid shadow-md hover-scale cursor-pointer">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {}
      {historyItem && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in text-left"
          onMouseDown={() => setHistoryItem(null)}
        >
          <div 
            className="relative w-full max-w-[400px] rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F0F3] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(54,186,111,0.1)] text-[#36BA6F]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <h3 className="font-plus-jakarta text-md font-bold text-[#0D0D0D]">Histórico de Preços</h3>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-[#606060] hover:text-[#0D0D0D] transition-fluid cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <p className="text-xs text-[#a0a0a0] mb-4">Insumo: <span className="text-[#0D0D0D] font-semibold uppercase">{historyItem.nome}</span></p>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 table-scrollbar">
              {historyItem.precos && historyItem.precos.map((p, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${idx === 0 ? 'bg-[rgba(54,186,111,0.05)] border-[#36BA6F33]' : 'bg-[#FAFAFA] border-[#F0F0F3]'}`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#0D0D0D]">R$ {p.valor.toFixed(2).replace('.', ',')}</span>
                    <span className="text-[10px] text-[#a0a0a0]">{p.data}</span>
                  </div>
                  {idx === 0 && <span className="text-[9px] font-bold text-[#36BA6F] bg-[#BDFFDA] px-2 py-0.5 rounded-full uppercase">Atual</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {}
      {(isAddModalOpen || editingItem) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-[2px] p-4 anim-fade-in"
          onMouseDown={() => { setIsAddModalOpen(false); clearForm(); }}
        >
          <div 
            className="relative flex w-full max-w-[600px] flex-col gap-5 rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto table-scrollbar text-left"
            onMouseDown={e => e.stopPropagation()}
          >

            {}
            <div className="flex h-[40px] w-full items-center justify-between border-b border-[#F0F0F3] pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[rgba(248,73,16,0.1)] text-[#F84910]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-8m0 0V4m0 8h8m-8 0H4"></path></svg>
                </div>
                <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">
                   {editingItem ? 'Editar Matéria-Prima' : 'Cadastrar Matéria-Prima'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                  setNome('');
                  setFornecedorId('');
                  setUnidade('');
                  setCusto('');
                  setEstoque('');
                }} 
                className="flex size-8 items-center justify-center rounded-full text-[#606060] hover:bg-gray-100 transition-fluid cursor-pointer hover:rotate-90"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Nome da Matéria-Prima</label>
                <input 
                  type="text"
                  placeholder="Ex: Essência de Alecrim"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={`h-11 w-full rounded-lg border ${formErrors.nome ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm`}
                />
                {formErrors.nome && <p className="text-[10px] text-red-500 mt-1">{formErrors.nome}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Fornecedor</label>
                <select 
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  className={`h-11 w-full rounded-lg border ${formErrors.fornecedorId ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm shadow-inner`}
                >
                  <option value="">Selecione um fornecedor...</option>
                  {(fornecedoresList || []).map(f => (
                    <option key={f.id} value={f.id}>{f.fantasia}</option>
                  ))}
                </select>
                {formErrors.fornecedorId && <p className="text-[10px] text-red-500 mt-1">{formErrors.fornecedorId}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Unidade de Medida</label>
                <select 
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className={`h-11 w-full rounded-lg border ${formErrors.unidade ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm`}
                >
                  <option value="">Selecione...</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="unid">unid</option>
                </select>
                {formErrors.unidade && <p className="text-[10px] text-red-500 mt-1">{formErrors.unidade}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Preço da Embalagem (R$)</label>
                <input 
                  type="text"
                  placeholder="Ex: 50,00"
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  className={`h-11 w-full rounded-lg border ${formErrors.custo ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm`}
                />
                {formErrors.custo && <p className="text-[10px] text-red-500 mt-1">{formErrors.custo}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Tamanho/Conteúdo (ex: 1.5)</label>
                <input 
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="Ex: 1.5"
                  value={tamanhoEmbalagem}
                  onChange={(e) => setTamanhoEmbalagem(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm"
                />
                <p className="text-[9px] text-[#F84910] mt-1 font-medium">
                  Custo base: R$ { ( (parseFloat(custo.replace(',', '.')) || 0) / (parseFloat(tamanhoEmbalagem) || 1) ).toFixed(2) } por {unidade || 'unidade'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">
                  {editingItem ? 'Estoque Atual (Somente Leitura)' : 'Estoque Inicial'}
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ex: 1,5"
                    value={estoque}
                    onChange={(e) => setEstoque(e.target.value)}
                    disabled={!!editingItem}
                    title={editingItem ? "Para alterar o estoque, registre uma Entrada ou Saída" : ""}
                    className={`h-11 w-full rounded-lg border ${formErrors.estoque ? 'border-red-500' : 'border-[#F0F0F3]'} px-4 font-inter text-sm outline-none transition-fluid ${editingItem ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#FAFAFA] focus:border-[#F84910] focus:shadow-sm'}`}
                  />
                  {editingItem && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                  )}
                </div>
                {formErrors.estoque && <p className="text-[10px] text-red-500 mt-1">{formErrors.estoque}</p>}
              </div>


              <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Foto da Matéria-Prima</label>
                <div className="flex items-center gap-4">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#F0F0F3] bg-[#FAFAFA] text-[#606060] transition-fluid hover:border-[#F84910] hover:text-[#F84910]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span>{imagem ? imagem.name : 'Selecionar Imagem'}</span>
                  </button>
                  {imagePreview && (
                    <div className="relative size-11 rounded-lg border border-[#F0F0F3] overflow-hidden group">
                      <img src={imagePreview} className="size-full object-cover" />
                      <button onClick={() => { setImagem(null); setImagePreview(null); }} className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {}
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-[#F0F0F3]">
              <div>
                {editingItem && (
                  <button 
                    onClick={() => handleDeleteItem(editingItem)}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg px-4 font-plus-jakarta text-sm font-bold text-[#BA0000] hover:bg-red-50 transition-fluid cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
                    Excluir
                  </button>
                )}
              </div>
              <button 
                onClick={handleSaveMateriaPrima}
                className={`
                  flex h-11 items-center justify-center gap-3 rounded-lg px-8 font-plus-jakarta text-sm font-semibold tracking-wide
                  transition-all duration-500 ease-in-out transform
                  ${isFormValid 
                    ? 'bg-[#36BA6F] text-[#BDFFDA] shadow-[0_0_20px_rgba(54,186,111,0.3)] hover:scale-105 active:scale-95 cursor-pointer' 
                    : 'bg-[#F0F0F3] text-[#BEBEBE] cursor-not-allowed opacity-60'
                  }
                `}
                onMouseDown={() => {
                  if (!isFormValid) {
                    setNotification({ title: 'Campos Obrigatórios', message: 'Por favor, preencha todos os campos do formulário antes de salvar.', type: 'error' });
                  }
                }}
              >
                <span>{loading ? 'Salvando...' : 'Salvar e Atualizar'}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${isFormValid ? 'animate-[pulse_2s_infinite]' : ''}`}>
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {historyItem && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in text-left"
          onMouseDown={() => setHistoryItem(null)}
        >
          <div 
            className="relative w-full max-w-[400px] rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F0F3] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(54,186,111,0.1)] text-[#36BA6F]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <h3 className="font-plus-jakarta text-md font-bold text-[#0D0D0D]">Histórico de Preços</h3>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-[#606060] hover:text-[#0D0D0D] transition-fluid cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <p className="text-xs text-[#a0a0a0] mb-4">Insumo: <span className="text-[#0D0D0D] font-semibold">{historyItem.nome}</span></p>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 table-scrollbar">
              {historyItem.precos && historyItem.precos.map((p, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${idx === 0 ? 'bg-[rgba(54,186,111,0.05)] border-[#36BA6F33]' : 'bg-[#FAFAFA] border-[#F0F0F3]'}`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#0D0D0D]">R$ {p.valor.toFixed(2).replace('.', ',')}</span>
                    <span className="text-[10px] text-[#a0a0a0]">{p.data}</span>
                  </div>
                  {idx === 0 && <span className="text-[9px] font-bold text-[#36BA6F] bg-[#BDFFDA] px-2 py-0.5 rounded-full uppercase">Atual</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onMouseDown={() => setZoomedImage(null)}
        >
           <div 
             className="relative max-w-[90vw] max-h-[90vh] overflow-hidden rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
             onMouseDown={e => e.stopPropagation()}
           >
              <img src={zoomedImage} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-fluid backdrop-blur-md cursor-pointer"
              >
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
