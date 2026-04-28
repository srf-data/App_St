import React, { useState, useEffect } from 'react';
import { apiFetch } from './utils/api';


export default function Fornecedores({ 
  fetchFornecedores,
  isAddModalOpen, 
  setIsAddModalOpen, 
  searchQuery, 
  fornecedoresList = [], 
  setFornecedoresList,
  insumosList = [],
  setInsumosList,
  setProdutosList,
  setNotification
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fornToDelete, setFornToDelete] = useState(null);

  
  // Escape Key listener for Modais
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        clearForm();
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setIsAddModalOpen]);

  // Form States
  const [razaoSocial, setRazaoSocial] = useState('');
  const [fantasia, setFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [contato, setContato] = useState('');
  
  const maskCnpj = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const maskPhone = (value) => {
    if (value.includes('@')) return value;
    let numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    } else {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
    }
  };

  const ITEMS_PER_PAGE = 20;

  const filteredFornecedores = fornecedoresList.filter(f => 
    f.razaoSocial.toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    f.fantasia.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    f.cnpj.includes(searchQuery || '') ||
    f.id.toString().includes(searchQuery || '')
  );

  const totalPages = Math.ceil(filteredFornecedores.length / ITEMS_PER_PAGE) || 1;
  const paginatedFornecedores = filteredFornecedores.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const [loading, setLoading] = useState(false);

  const handleSaveFornecedor = async () => {
    if (!razaoSocial.trim() || loading) return;
    setLoading(true);

    let finalCnpj = cnpj.trim();
    if (!finalCnpj) {
      finalCnpj = '00.000.000/0000-00';
    } else {
      const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
      if (!cnpjRegex.test(finalCnpj)) {
        setNotification({ 
          title: 'CNPJ Inválido', 
          message: 'O CNPJ deve estar no formato 00.000.000/0000-00 ou ser deixado em branco.', 
          type: 'error' 
        });
        setLoading(false);
        return;
      }
    }

    const capitalizeWords = (str) => {
      if (!str) return '';
      return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const payload = { 
      razaoSocial, 
      fantasia, 
      cnpj: finalCnpj, 
      cidade: capitalizeWords(cidade), 
      estado: estado.toUpperCase(), 
      contato 
    };

    try {
      if (editingItem) {
        const res = await apiFetch(`/api/fornecedores/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setNotification({ title: 'Sucesso!', message: 'Fornecedor atualizado com sucesso!', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
          setEditingItem(null);
          if (fetchFornecedores) await fetchFornecedores();
        }
      } else {
        const res = await apiFetch('/api/fornecedores', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setNotification({ title: 'Sucesso!', message: 'Fornecedor cadastrado com sucesso!', type: 'success' });
          setTimeout(() => { setNotification(null); setIsAddModalOpen(false); }, 1500);
          if (fetchFornecedores) await fetchFornecedores();
        }
      }
    } catch (e) {
      console.error(e);
      setNotification({ title: 'Erro', message: 'Falha na comunicação com o servidor', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }

    setRazaoSocial('');
    setFantasia('');
    setCnpj('');
    setCidade('');
    setEstado('');
    setContato('');
  };

  const clearForm = () => {
    setRazaoSocial('');
    setFantasia('');
    setCnpj('');
    setCidade('');
    setEstado('');
    setContato('');
    setEditingItem(null);
  };

  const handleDeleteFornecedor = (forn) => {
    setFornToDelete(forn);
    setShowDeleteModal(true);
  };

  const confirmDeleteFornecedor = async () => {
    if (!fornToDelete) return;

    try {
      const res = await apiFetch(`/api/fornecedores/${fornToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (fetchFornecedores) await fetchFornecedores();

        // Limpeza visual de insumos vinculados
        const insumosToRemove = insumosList?.filter(i => 
          (i.fornecedor || '').toLowerCase().trim() === (fornToDelete.fantasia || '').toLowerCase().trim()
        ) || [];
        const insumoIdsToRemove = insumosToRemove.map(i => i.id);

        if (setInsumosList) setInsumosList(prev => prev.filter(i => !insumoIdsToRemove.includes(i.id)));
        if (setProdutosList && insumoIdsToRemove.length > 0) {
          setProdutosList(prev => prev.map(p => ({
            ...p,
            insumos: (p.insumos || []).filter(pi => !insumoIdsToRemove.includes(pi.id))
          })));
        }

        setNotification({ 
          title: 'Excluído!', 
          message: `O fornecedor apagado e ${insumosToRemove.length} insumo(s) associado(s) foram removidos da tela.`, 
          type: 'info' 
        });

        setTimeout(() => setNotification(null), 3500);
        setShowDeleteModal(false);
        setFornToDelete(null);
        setEditingItem(null);
        setIsAddModalOpen(false);
      }
    } catch(e) {
      console.error(e);
      setNotification({ title: 'Erro', message: 'Falha ao deletar Fornecedor', type: 'error' });
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setRazaoSocial(item.razaoSocial);
    setFantasia(item.fantasia);
    setCnpj(item.cnpj);
    setCidade(item.cidade);
    setEstado(item.estado);
    setContato(item.contato);
  };

  const isFormValid = razaoSocial.trim();

  return (
    <div className="flex h-full w-full flex-col p-4 sm:p-6 overflow-hidden anim-fade-in relative">
      <div className="flex w-full flex-col gap-2.5 rounded-lg border border-[#F0F0F3] bg-white p-2.5 shadow-[0_0_20px_rgba(139,139,139,0.03)] transition-all overflow-x-auto table-scrollbar relative">
        <div className="min-w-[1020px] flex flex-col gap-2.5">
          {/* Table Header */}
          <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
            <div className="w-[80px] text-center">Código</div>
            <div className="flex-1 w-[auto] max-w-none text-left px-4">Razão Social</div>
            <div className="w-[140px] text-center">Fantasia</div>
            <div className="w-[140px] text-center">CNPJ</div>
            <div className="w-[120px] text-center">Cidade</div>
            <div className="w-[60px] text-center">UF</div>
            <div className="w-[140px] text-center">Contato</div>
            <div className="w-[80px] text-center">Ações</div>
          </div>

          {/* List */}
          {paginatedFornecedores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border border-[#F0F0F3] my-4 anim-fade-in gap-3">
              <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(248,73,16,0.08)] text-[#F84910]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div>
                <h3 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Nenhum fornecedor encontrado</h3>
                <p className="font-inter text-sm text-[#606060] max-w-[320px] mt-1">
                  Ainda não há registros de fornecedores cadastrados de acordo com os filtros. Adicione um novo parceiro para começar.
                </p>
              </div>
            </div>
          ) : (
            paginatedFornecedores.map((forn, idx) => (
              <div 
                key={forn.id} 
                className="flex h-[50px] w-full items-center justify-between rounded-lg bg-white px-4 font-inter text-xs font-medium text-[#606060] transition-fluid hover:bg-slate-50 border-b border-[#F0F0F3] last:border-0 relative anim-slide-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="w-[80px] text-center text-[#0D0D0D]">{forn.id}</div>
                <div className="flex-1 w-[auto] max-w-none text-left px-4 truncate text-[#0D0D0D] font-semibold uppercase">{forn.razaoSocial}</div>
                <div className="w-[140px] text-center truncate italic">{forn.fantasia || '-'}</div>
                <div className="w-[140px] text-center">{forn.cnpj || '-'}</div>
                <div className="w-[120px] text-center">{forn.cidade || '-'}</div>
                <div className="w-[60px] text-center font-bold text-[#F84910]">{forn.estado || '-'}</div>
                <div className="w-[140px] text-center">{forn.contato || '-'}</div>
                 <div className="w-[80px] flex justify-center">
                    <button 
                      onClick={() => handleOpenEdit(forn)}
                      className="flex size-7 items-center justify-center rounded-lg bg-[#D7D7D740] text-[#606060] hover:bg-[#F84910] hover:text-white transition-fluid cursor-pointer hover-scale"
                      title="Editar Fornecedor"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                 </div>
              </div>
            ))
          )}

          {/* Footer Paginação */}
          <div className="flex h-[48px] w-full items-center justify-between border-t border-[#F0F0F3] px-2 pt-2 mt-2">
            <div className="font-inter text-xs font-medium text-[#606060]">
              {filteredFornecedores.length} registros encontrados. Página {currentPage} de {totalPages}
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
                  Esta ação removerá permanentemente o fornecedor "{fornToDelete?.razaoSocial}" da sua base de dados.
                </p>
              </div>
              <div className="flex w-full gap-3 mt-2">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-11 rounded-lg bg-gray-100 font-plus-jakarta text-sm font-bold text-[#606060] hover:bg-gray-200 transition-fluid cursor-pointer">Cancelar</button>
                <button onClick={confirmDeleteFornecedor} className="flex-1 h-11 rounded-lg bg-[#BA0000] font-plus-jakarta text-sm font-bold text-white hover:bg-red-700 transition-fluid shadow-md hover-scale cursor-pointer" id="supplier-delete-confirm">Sim, Excluir</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ADICIONAR / EDITAR */}
        {(isAddModalOpen || editingItem) && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-[2px] p-4 anim-fade-in"
            onMouseDown={() => { setIsAddModalOpen(false); clearForm(); }}
          >
            <div 
              className="relative flex w-full max-w-[600px] flex-col gap-5 rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto table-scrollbar text-left"
              onMouseDown={e => e.stopPropagation()}
            >

              <div className="flex h-[40px] w-full items-center justify-between border-b border-[#F0F0F3] pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[rgba(248,73,16,0.1)] text-[#F84910]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                  </div>
                  <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">
                     {editingItem ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
                  </h3>
                </div>
                <button onClick={() => { setIsAddModalOpen(false); clearForm(); }} className="flex size-8 items-center justify-center rounded-full text-[#606060] hover:bg-gray-100 transition-fluid cursor-pointer hover:rotate-90">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Razão Social</label>
                  <input type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Nome Fantasia</label>
                  <input type="text" value={fantasia} onChange={e => setFantasia(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">CNPJ (Opcional)</label>
                  <input 
                    type="text" 
                    value={cnpj} 
                    placeholder="00.000.000/0000-00"
                    onChange={e => setCnpj(maskCnpj(e.target.value))} 
                    className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Cidade</label>
                  <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Estado (UF)</label>
                  <input type="text" maxLength="2" value={estado} onChange={e => setEstado(e.target.value)} className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm" />
                </div>
                <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                  <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Contato (Telefone/E-mail)</label>
                  <input 
                    type="text" 
                    value={contato} 
                    onChange={e => setContato(maskPhone(e.target.value))} 
                    placeholder="(00) 00000-0000 ou exemplo@gmail.com"
                    className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm" 
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-[#F0F0F3]">
                <div>
                  {editingItem && (
                    <button 
                      onClick={() => handleDeleteFornecedor(editingItem)}
                      className="flex h-11 items-center justify-center gap-2 rounded-lg px-4 font-plus-jakarta text-sm font-bold text-[#BA0000] hover:bg-red-50 transition-fluid cursor-pointer"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
                      Excluir
                    </button>
                  )}
                </div>
                <button 
                  onClick={handleSaveFornecedor}
                  disabled={!isFormValid || loading}
                  className={`flex h-11 items-center justify-center gap-3 rounded-lg px-8 font-plus-jakarta text-sm font-semibold tracking-wide transition-fluid hover-scale shadow-md ${isFormValid && !loading ? 'bg-[#36BA6F] text-[#BDFFDA] cursor-pointer' : 'bg-[#F0F0F3] text-[#BEBEBE] cursor-not-allowed opacity-60'}`}
                  onMouseDown={() => {
                    if (!isFormValid && !loading) {
                      setNotification({ title: 'Campos Obrigatórios', message: 'Por favor, preencha a Razão Social do fornecedor.', type: 'error' });
                    }
                  }}
                >
                  <span>{loading ? 'Processando...' : 'Salvar e Atualizar'}</span>
                  {loading ? (
                     <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
