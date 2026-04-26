import React, { useState, useEffect } from 'react';
import { cleanNotificationMessage, formatBRNumber } from './utils/validators';
import { entrySchema, formatZodError } from './utils/validators';

export default function Entradas({ entradasList, setEntradasList, produtosList, setProdutosList, insumosList, setInsumosList, fornecedoresList, fetchEntradas, fetchInsumos, fetchProdutos, isAddModalOpen, setIsAddModalOpen, searchQuery, setNotification }) {
  const [activeTab, setActiveTab] = useState('produtos');
  const [activeMainTab, setActiveMainTab] = useState('produtos');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingEntrada, setEditingEntrada] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [insumoToRemoveId, setInsumoToRemoveId] = useState(null);

  const [formErrors, setFormErrors] = useState({});
  const ITEMS_PER_PAGE = 20;

  const [nomeProduto, setNomeProduto] = useState('');
  const [insumosAdicionados, setInsumosAdicionados] = useState([]);

  const [curInsumoNome, setCurInsumoNome] = useState('');
  const [curInsumoFornecedor, setCurInsumoFornecedor] = useState('');
  const [curInsumoQtde, setCurInsumoQtde] = useState('');
  const [curInsumoValor, setCurInsumoValor] = useState('');
  const [curInsumoTamanho, setCurInsumoTamanho] = useState('1');

  const [entradaProdutoId, setEntradaProdutoId] = useState('');
  const [entradaProdutoQtde, setEntradaProdutoQtde] = useState('');
  const [entradaProdutoDesconto, setEntradaProdutoDesconto] = useState('');
  const [entradaInsumoDesconto, setEntradaInsumoDesconto] = useState('');

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingEntrada(null);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setIsAddModalOpen]);

  useEffect(() => {
    if (curInsumoNome.length > 2) {
      const found = insumosList.find(i => i.nome.toLowerCase() === curInsumoNome.toLowerCase());
      if (found) {
        setCurInsumoFornecedor(found.fornecedor);
        setCurInsumoValor(found.custoUnitario.toString());
      }
    }
  }, [curInsumoNome, insumosList]);

  const validEntradas = (entradasList || []).filter(e => {
    if (!e) return false;
    if (!e.fornecedor) {
       e.fornecedor = 'Sem Fornecedor';
    }
    const fName = String(e.fornecedor).toLowerCase().trim();
    if (fName === 'produção própria' || fName === 'producao propria' || fName === 'sem fornecedor') return true;
    return (fornecedoresList || []).some(f => (f.fantasia || '').toLowerCase().trim() === fName);
  });

  const filteredEntradas = validEntradas.filter(e => {
    const searchMatch = e.razao?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (e.fornecedor || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      e.id.toString().includes(searchQuery || '');

    if (activeMainTab === 'produtos') {
      return searchMatch && e.fornecedor === 'Produção Própria';
    } else {
      return searchMatch && e.fornecedor !== 'Produção Própria';
    }
  });

  const totalPages = Math.ceil(filteredEntradas.length / ITEMS_PER_PAGE) || 1;
  const paginatedEntradas = filteredEntradas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSaveEntradaProduto = async () => {
    const dataToValidate = {
      qtde: entradaProdutoQtde,
      desconto: entradaProdutoDesconto || 0,
    };

    const result = entrySchema.safeParse(dataToValidate);

    if (!result.success || !entradaProdutoId) {
      const errors = formatZodError(result.error);
      setFormErrors(errors);
      setNotification({
        title: 'Erro de Validação',
        message: !entradaProdutoId ? 'Selecione um produto.' : 'Verifique os dados informados.',
        type: 'error'
      });
      return;
    }

    setFormErrors({});

    try {
      const response = await fetch('http://localhost:3005/api/entradas/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: entradaProdutoId,
          qtde: entradaProdutoQtde,
          desconto: entradaProdutoDesconto || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar produção.');
      }

      await fetchEntradas();
      await fetchProdutos();
      await fetchInsumos();

      setNotification({ title: 'Sucesso!', message: 'Entrada de produto finalizado registrada.', type: 'success' });
      setTimeout(() => { setNotification(null); setIsAddModalOpen(false); }, 1500);
      setEntradaProdutoId('');
      setEntradaProdutoQtde('');
      setEntradaProdutoDesconto('');
    } catch (error) {
      console.error(error);
      setNotification({ title: 'Erro na Produção', message: cleanNotificationMessage(error.message), type: 'error' });
    }
  };

  const handleVerificarAutocomplete = (val) => {
    setCurInsumoNome(val);
  };

  const handleAddInsumo = () => {
    const dataToValidate = {
      qtde: curInsumoQtde,
      valor: curInsumoValor.replace(',', '.'),
    };

    const result = entrySchema.safeParse(dataToValidate);

    if (!result.success || curInsumoNome.trim() === '') {
      const errors = formatZodError(result.error);
      setFormErrors(errors);
      return;
    }

    const hasAtualizar = insumosAdicionados.some(i => i.nome.toLowerCase() === curInsumoNome.toLowerCase() && i.acaoPreco === 'atualizar');
    const defaultAcaoPreco = hasAtualizar ? 'novo' : 'atualizar';

    const qtyComercial = parseFloat(curInsumoQtde) || 1;
    const sizeEmbalagem = parseFloat(curInsumoTamanho) || 1;
    const priceEmbalagem = parseFloat(curInsumoValor.replace(',', '.')) || 0;

    const novoInsumo = {
      id: Date.now().toString(),
      nome: curInsumoNome,
      fornecedor: curInsumoFornecedor,
      qtde: qtyComercial * sizeEmbalagem,
      custoUnitario: priceEmbalagem / sizeEmbalagem,
      acaoPreco: defaultAcaoPreco,
      qtyComercial,
      sizeEmbalagem,
      priceEmbalagem
    };

    setInsumosAdicionados([...insumosAdicionados, novoInsumo]);

    setFormErrors({});
    setCurInsumoNome('');
    setCurInsumoQtde('');
    setCurInsumoValor('');
  };

  const updateQtde = (id, delta) => {
    setInsumosAdicionados(insumosAdicionados.map(i => {
      if (i.id === id) {
        const newQtde = Math.max(1, i.qtde + delta);
        return { ...i, qtde: newQtde };
      }
      return i;
    }));
  };

  const removeInsumo = (id) => {
    setInsumoToRemoveId(id);
    setShowDeleteModal(true);
  };

  const confirmRemoveInsumo = () => {
    setInsumosAdicionados(insumosAdicionados.filter(i => i.id !== insumoToRemoveId));
    setShowDeleteModal(false);
    setInsumoToRemoveId(null);
  };

  const handleSaveProduto = async () => {
    // Basic validation
    if (!nomeProduto || nomeProduto.trim() === '' || insumosAdicionados.length === 0) {
      setNotification({ title: 'Atenção', message: 'Selecione o fornecedor e adicione ao menos um insumo.', type: 'warning' });
      return;
    }

    setFormErrors({});
    try {
      const response = await fetch('http://localhost:3005/api/entradas/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornecedor: nomeProduto.trim(),
          insumos: insumosAdicionados,
          descontoTotal: entradaInsumoDesconto || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar entrada de insumos.');
      }

      await fetchEntradas();
      await fetchInsumos();

      setNotification({ title: 'Sucesso!', message: editingEntrada ? 'Registro atualizado com sucesso.' : 'Entrada(s) de insumo registrada(s).', type: 'success' });
      setTimeout(() => { setNotification(null); setIsAddModalOpen(false); }, 1500);
      setEditingEntrada(null);
      setInsumosAdicionados([]);
      setNomeProduto('');
      setEntradaInsumoDesconto('');
      setEntradaProdutoDesconto('');
    } catch (error) {
      console.error("Erro ao salvar entrada:", error);
      setNotification({ title: 'Erro ao Salvar', message: cleanNotificationMessage(error.message), type: 'error' });
      setIsAddModalOpen(false);
      setEditingEntrada(null);
    }
  };

  const handleOpenEdit = (entrada) => {
    setEditingEntrada(entrada);
    setFormErrors({});
    setActiveTab(activeMainTab); // Lock the modal to current list context
    if (activeMainTab === 'produtos') {
      const prod = produtosList.find(p => p.nome === entrada.razao);
      setEntradaProdutoId(prod ? prod.id : '');
      setEntradaProdutoQtde(entrada.qtde || 1);
      setEntradaProdutoDesconto(String(entrada.desconto || '').replace(',', '.'));
    } else {
      setNomeProduto(entrada.fornecedor || entrada.razao);
      setEntradaInsumoDesconto(String(entrada.desconto || '').replace(',', '.'));
      setInsumosAdicionados([
        {
          id: 'ext-' + entrada.id,
          nome: entrada.razao,
          fornecedor: entrada.fornecedor,
          qtde: entrada.qtde || 1,
          custoUnitario: parseFloat(String(entrada.valor).replace('.', '').replace(',', '.')) / (entrada.qtde || 1),
          acaoPreco: 'novo'
        }
      ]);
    }
  };

  const isFormValid = nomeProduto.trim() !== '' && insumosAdicionados.length > 0;

  return (
    <>
      <div className="flex w-full flex-col gap-2.5 rounded-lg border border-[#F0F0F3] bg-white p-2.5 shadow-[0_0_20px_rgba(139,139,139,0.03)] transition-all overflow-x-auto table-scrollbar relative">

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b border-[#F0F0F3] px-2 mt-2">
          <button
            onClick={() => setActiveMainTab('produtos')}
            className={`pb-2 px-4 text-sm font-semibold transition-all ${activeMainTab === 'produtos' ? 'text-[#F84910] border-b-2 border-[#F84910]' : 'text-[#606060] border-b-2 border-transparent hover:text-[#0D0D0D]'}`}
          >
            Entradas de Produtos
          </button>
          <button
            onClick={() => setActiveMainTab('insumos')}
            className={`pb-2 px-4 text-sm font-semibold transition-all ${activeMainTab === 'insumos' ? 'text-[#F84910] border-b-2 border-[#F84910]' : 'text-[#606060] border-b-2 border-transparent hover:text-[#0D0D0D]'}`}
          >
            Entradas de Insumos (M.P.)
          </button>
        </div>

        <div className="min-w-[1020px] flex flex-col gap-2.5">
          {/* Table Header */}
          <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-2 font-inter text-xs font-medium text-[#606060]">
            <div className="w-[80px] text-center">Código</div>
            <div className="flex-1 w-[auto] max-w-none text-left px-4">Nome do Produto</div>
            <div className="w-[70px] text-center">Qtd.</div>
            <div className="w-[110px] text-center">Vlr. Unit.</div>
            <div className="w-[60px] text-center">Desc.</div>
            <div className="w-[110px] text-center">Total (Líq.)</div>
            <div className="w-[110px] text-center">Emissão</div>
            <div className="w-[110px] text-center">Entrada</div>
            <div className="w-[110px] text-center">Cadastro</div>
            <div className="w-[80px] text-center">Ações</div>
          </div>

          {/* Table Body */}
          <div className="flex flex-col gap-[2px]">
            {paginatedEntradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg border border-[#F0F0F3] my-4 anim-fade-in gap-3">
                <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(248,73,16,0.08)] text-[#F84910]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div>
                  <h3 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Nenhuma entrada encontrada</h3>
                  <p className="font-inter text-sm text-[#606060] max-w-[320px] mt-1">
                    Ainda não há registros de entradas de {activeMainTab === 'produtos' ? 'produtos finalizados' : 'insumos'} cadastrados. Adicione uma nova movimentação para começar.
                  </p>
                </div>
              </div>
            ) : (
              paginatedEntradas.map((entrada, idx) => (
                <div
                  key={idx}
                  className="flex h-[44px] w-full items-center justify-between rounded-lg bg-white px-2 hover:bg-slate-50 transition-fluid border-b border-[#F0F0F3] last:border-0 hover:shadow-sm anim-slide-up"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="w-[80px] text-center font-inter text-xs font-medium text-[#0D0D0D]">{entrada.id || '-'}</div>
                  <div className="flex-1 w-[auto] max-w-none text-left px-4">
                    <p className="font-inter text-xs font-semibold text-[#0D0D0D] truncate uppercase">{entrada.razao || '-'}</p>
                    {entrada.fornecedor && entrada.fornecedor !== entrada.razao && (
                      <p className="font-inter text-[10px] text-[#A0A0A0] truncate uppercase pt-0.5">{entrada.fornecedor}</p>
                    )}
                  </div>
                  <div className="w-[70px] text-center font-inter text-xs font-bold text-[#0D0D0D]">{entrada.qtde || '-'}</div>
                  <div className="w-[110px] text-center font-inter text-xs font-medium text-[#606060]">R$ {entrada.valor || '0,00'}</div>
                  <div className="w-[60px] text-center font-inter text-xs font-medium text-[#BA0000]">-{entrada.desconto || '0,00'}</div>
                  <div className="w-[110px] text-center font-inter text-xs font-bold text-[#F84910]">R$ {entrada.total || '0,00'}</div>
                  <div className="w-[110px] text-center font-inter text-xs font-medium text-[#606060]">{entrada.emissao || '-'}</div>
                  <div className="w-[110px] text-center font-inter text-xs font-medium text-[#606060]">{entrada.entrada || '-'}</div>
                  <div className="w-[110px] text-center font-inter text-xs font-medium text-[#606060]">{entrada.cadastro || '-'}</div>
                  <div className="w-[80px] flex justify-center">
                    <button
                      onClick={() => handleOpenEdit(entrada)}
                      className="flex size-7 items-center justify-center rounded-lg bg-[#D7D7D740] text-[#606060] hover:bg-[#F84910] hover:text-white transition-fluid cursor-pointer hover-scale"
                      title="Editar Entrada"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Pagination */}
          <div className="flex h-[48px] w-full items-center justify-between border-t border-[#F0F0F3] px-2 pt-2 mt-2">
            <div className="font-inter text-xs font-medium text-[#606060]">
              {filteredEntradas.length} registros encontrados. Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-white">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`flex size-6 items-center justify-center rounded cursor-pointer transition-fluid ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`flex size-6 items-center justify-center rounded text-[11px] font-bold transition-fluid cursor-pointer ${currentPage === i + 1 ? 'bg-[#F84910] text-white shadow-sm' : 'text-[#606060] hover:bg-gray-100'}`}
                >
                  {i + 1}
                </button>
              ))}
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
      </div>

      {(isAddModalOpen || editingEntrada) && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in"
          onMouseDown={() => { setIsAddModalOpen(false); setEditingEntrada(null); }}
        >
          <div
            className="relative flex w-full max-w-[850px] flex-col rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-2xl max-h-[95vh] overflow-y-auto table-scrollbar text-left animate-in zoom-in-95 duration-300"
            onMouseDown={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="mb-4 flex flex-col gap-4 border-b border-[#F0F0F3] pb-4">
              <div className="flex items-center justify-between">
                <h2 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">
                  {editingEntrada ? 'Editar Registro / Entrada' : 'Adicionar Novo Registro'}
                </h2>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEntrada(null);
                    setNomeProduto('');
                    setInsumosAdicionados([]);
                  }}
                  className="flex size-8 items-center justify-center rounded-full text-[#606060] transition-fluid hover:bg-gray-100 hover:rotate-90"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 px-2">
                <button
                  onClick={() => setActiveTab('produtos')}
                  className={`pb-2 px-4 text-sm font-semibold transition-all ${activeTab === 'produtos' ? 'text-[#F84910] border-b-2 border-[#F84910]' : 'text-[#606060] border-b-2 border-transparent hover:text-[#0D0D0D]'}`}
                >
                  Entrada de Produtos
                </button>
                <button
                  onClick={() => setActiveTab('insumos')}
                  className={`pb-2 px-4 text-sm font-semibold transition-all ${activeTab === 'insumos' ? 'text-[#F84910] border-b-2 border-[#F84910]' : 'text-[#606060] border-b-2 border-transparent hover:text-[#0D0D0D]'}`}
                >
                  Entrada de Insumos (M.P.)
                </button>
              </div>
            </div>

            {activeTab === 'produtos' ? (
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Selecionar Produto Finalizado</label>
                    <select
                      value={entradaProdutoId}
                      onChange={e => setEntradaProdutoId(e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] px-4 font-inter text-sm outline-none focus:border-[#F84910]"
                    >
                      <option value="">Selecione...</option>
                      {produtosList.map(p => <option key={p.id} value={p.id}>{p.nome || ''} (Estoque: {p.qtd})</option>)}
                    </select>
                  </div>
                  <div className="w-[120px] flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Quantidade</label>
                    <input
                      type="number"
                      value={entradaProdutoQtde}
                      onChange={e => setEntradaProdutoQtde(e.target.value)}
                      className={`h-11 w-full rounded-lg border ${formErrors.qtde ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[#FAFAFA] px-4 text-center font-inter text-sm outline-none focus:border-[#F84910]`}
                    />
                    {formErrors.qtde && <p className="text-[10px] text-red-500 mt-1 text-center">{formErrors.qtde}</p>}
                  </div>
                  <div className="w-[120px] flex flex-col gap-1.5">
                    <label className="font-plus-jakarta text-xs font-semibold text-[#606060]">Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={entradaProdutoDesconto}
                      onChange={e => setEntradaProdutoDesconto(e.target.value)}
                      placeholder="0,00"
                      className={`h-11 w-full rounded-lg border ${formErrors.desconto ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[#FAFAFA] px-4 text-center font-inter text-sm outline-none focus:border-[#F84910]`}
                    />
                    {formErrors.desconto && <p className="text-[10px] text-red-500 mt-1 text-center">{formErrors.desconto}</p>}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#F0F0F3] bg-[#FAFAFA] p-4 text-xs text-[#606060]">
                  <p><strong>Custo de Produção Base:</strong> {entradaProdutoId && produtosList.find(p => String(p.id) === String(entradaProdutoId)) ? produtosList.find(p => String(p.id) === String(entradaProdutoId)).custo : 'R$ 0,00'}</p>
                </div>

                <div className="mt-4 flex w-full justify-between items-center border-t border-[#F0F0F3] pt-4">
                  {editingEntrada && (
                    <button
                      onClick={() => {
                        setDeleteAction(() => () => {
                          // REMOÇÃO PERMANENTE DO PRODUTO (Conforme solicitado)
                          setProdutosList(produtosList.filter(p => p.nome !== editingEntrada.razao));
                          setEntradasList(entradasList.filter(e => e.id !== editingEntrada.id));
                          setIsAddModalOpen(false);
                          setEditingEntrada(null);
                          setShowDeleteModal(false);
                        });
                        setShowDeleteModal(true);
                      }}
                      className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[rgba(186,0,0,0.1)] px-4 font-plus-jakarta text-sm font-semibold tracking-wide text-[#BA0000] hover:bg-[#BA0000] hover:text-white transition-fluid"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      <span>Excluir Registro</span>
                    </button>
                  )}
                  <button
                    onClick={handleSaveEntradaProduto}
                    onMouseDown={() => {
                      if (!entradaProdutoId || !entradaProdutoQtde) {
                        setNotification({ title: 'Campos Obrigatórios', message: 'Por favor, selecione o produto e informe a quantidade produzida.', type: 'error' });
                      }
                    }}
                    className={`flex h-11 ${editingEntrada ? 'flex-1 max-w-[280px] ml-auto' : ''} items-center justify-center gap-3 rounded-lg px-6 font-plus-jakarta text-sm font-semibold tracking-wide transition-fluid shadow-md ${(!entradaProdutoId || !entradaProdutoQtde) ? 'bg-[#F0F0F3] text-[#BEBEBE] cursor-not-allowed opacity-60' : 'bg-[#36BA6F] text-[#BDFFDA] cursor-pointer hover:bg-[#2eaa65] hover:scale-105'}`}
                  >
                    <span>Salvar e Registrar Produção</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">

                {/* Supplier Search Wrapper */}
                <div className="mb-6 flex gap-4">
                  <div className="flex w-full flex-col gap-1.5">
                    <label className="font-inter text-xs font-medium text-[#606060] px-1">Fornecedor (Nome de Fantasia)</label>
                    <select
                      value={nomeProduto}
                      onChange={e => setNomeProduto(e.target.value)}
                      disabled={insumosAdicionados.length > 0}
                      className="h-10 w-full rounded-lg border border-[#F0F0F3] bg-[rgba(215,215,215,0.15)] px-4 font-inter text-sm text-[#0D0D0D] outline-none transition-fluid focus:bg-white focus:shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 disabled:text-gray-500"
                    >
                      <option value="">Selecione o fornecedor (Fantasia)...</option>
                      {fornecedoresList && fornecedoresList.map((f, i) => (
                        <option key={i} value={f.fantasia}>{f.fantasia}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex w-[180px] flex-col gap-1.5">
                    <label className="font-inter text-xs font-medium text-[#606060] px-1">Desc. Fornecedor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={entradaInsumoDesconto}
                      onChange={e => setEntradaInsumoDesconto(e.target.value)}
                      placeholder="0,00"
                      className={`h-10 w-full rounded-lg border ${formErrors.desconto ? 'border-red-500' : 'border-[#F0F0F3]'} bg-[rgba(215,215,215,0.15)] px-4 font-inter text-sm text-[#0D0D0D] outline-none transition-fluid focus:bg-white focus:shadow-sm`}
                    />
                    {formErrors.desconto && <p className="text-[10px] text-red-500 mt-1">{formErrors.desconto}</p>}
                  </div>
                </div>

                {/* Inner Table "Receita" */}
                <div className="mb-4 flex flex-col rounded-lg border border-[#F0F0F3] bg-white p-3">
                  <h3 className="mb-3 px-2 font-plus-jakarta text-md font-bold text-[#0D0D0D]">Receita (Lista de Insumos)</h3>

                  {/* Inner Table Header */}
                  <div className="flex h-[36px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4">
                    <div className="w-[40px] text-center font-inter text-xs font-medium text-[#606060]">Cód.</div>
                    <div className="w-[140px] text-left font-inter text-xs font-medium text-[#606060]">Insumo</div>
                    <div className="w-[140px] text-left font-inter text-xs font-medium text-[#606060]">Fornecedor</div>
                    <div className="w-[80px] text-center font-inter text-xs font-medium text-[#606060]">Qtde.</div>
                    <div className="w-[100px] text-center font-inter text-xs font-medium text-[#606060]">Unitário</div>
                    <div className="w-[100px] text-center font-inter text-xs font-medium text-[#606060]">Proporcional</div>
                    <div className="w-[110px] text-center font-inter text-xs font-medium text-[#606060]">Ação Preço</div>
                    <div className="w-[100px] text-center font-inter text-xs font-medium text-[#606060]">Ações</div>
                  </div>

                  {/* Added Insumos */}
                  <div className="mt-2 flex max-h-[160px] flex-col gap-2 overflow-y-auto">
                    {insumosAdicionados.map((insumo, idx) => (
                      <div key={insumo.id} className="flex h-[40px] w-full items-center justify-between rounded bg-white px-4 hover:bg-slate-50 transition border-b border-[#F0F0F3] last:border-0">
                        <div className="w-[40px] text-center font-inter text-xs font-semibold text-[#0D0D0D]">{idx + 1}</div>
                        <div className="w-[140px] truncate text-left font-inter text-xs font-medium text-[#606060]">{insumo.nome}</div>
                        <div className="w-[140px] truncate text-left font-inter text-[11px] font-medium text-[#a0a0a0]">{insumo.fornecedor}</div>
                        <div className="w-[80px] text-center font-inter text-xs font-medium text-[#606060]">{insumo.qtde} und.</div>
                        <div className="w-[100px] text-center font-inter text-xs font-medium text-[#606060]">R$ {insumo.custoUnitario.toFixed(2)}</div>
                        <div className="w-[100px] text-center font-inter text-xs font-bold text-[#36BA6F]">R$ {(insumo.qtde * insumo.custoUnitario).toFixed(2)}</div>
                        <div className="w-[110px] text-center">
                          <select
                            disabled={insumosAdicionados.some(i => i.acaoPreco === 'atualizar' && i.id !== insumo.id && i.nome.toLowerCase() === insumo.nome.toLowerCase())}
                            value={insumo.acaoPreco}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              setInsumosAdicionados(insumosAdicionados.map(i => {
                                if (i.id === insumo.id) return { ...i, acaoPreco: newStatus };
                                // Se estiver definido 'atualizar', os outros itens DO MESMO INSUMO devem ser resetados para 'novo'
                                if (newStatus === 'atualizar' && i.nome.toLowerCase() === insumo.nome.toLowerCase()) return { ...i, acaoPreco: 'novo' };
                                return i;
                              }));
                            }}
                            className={`h-7 w-full rounded border px-1 text-center text-[10px] font-medium outline-none transition-fluid ${insumo.acaoPreco === 'atualizar' ? 'border-[#36BA6F] bg-[rgba(54,186,111,0.05)] text-[#36BA6F]' : 'border-[#F0F0F3] bg-white text-[#606060]'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <option value="atualizar">Atualizar Preço</option>
                            <option value="novo">Novo Preço (Histórico)</option>
                          </select>
                        </div>
                        <div className="w-[100px] flex items-center justify-center gap-2">
                          <button onClick={() => updateQtde(insumo.id, -1)} className="flex size-6 items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                          <button onClick={() => updateQtde(insumo.id, 1)} className="flex size-6 items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                          <button onClick={() => removeInsumo(insumo.id)} className="flex size-6 items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-100 transition">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {insumosAdicionados.length === 0 && (
                      <div className="flex h-[40px] items-center justify-center text-xs text-[#a0a0a0] italic">
                        Nenhum insumo adicionado ainda.
                      </div>
                    )}
                  </div>

                  {/* Add New Insumo Row (Autocomplete feature) */}
                  <div className="mt-4 flex flex-col gap-2 rounded-lg bg-[rgba(240,240,243,0.5)] p-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="font-inter text-[10px] font-medium text-[#606060]">Nome do Insumo</label>
                        <select
                          value={curInsumoNome}
                          onChange={e => handleVerificarAutocomplete(e.target.value)}
                          disabled={!nomeProduto}
                          className="h-8 w-full rounded border border-[#e0e0e0] bg-white px-2 font-inter text-xs outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70"
                        >
                          <option value="">{nomeProduto ? 'Selecione um insumo...' : 'Selecione o fornecedor primeiro'}</option>
                          {insumosList
                            .filter(m => (fornecedoresList || []).some(f => (f.fantasia || '').toLowerCase().trim() === (m.fornecedor || '').toLowerCase().trim()))
                            .filter(m => {
                              const mForn = (m.fornecedor || '').toLowerCase();
                              const searchForn = (nomeProduto || '').toLowerCase();
                              return mForn === searchForn || mForn.includes(searchForn) || searchForn.includes(mForn);
                            })
                            .map((m, i) => <option key={i} value={m.nome}>{(m.nome.charAt(0).toUpperCase() + m.nome.slice(1))}</option>)}
                        </select>
                      </div>

                      {/* Supplier is now global, hiding redundant input */}
                      <div className="flex w-[80px] flex-col gap-1">
                        <label className="font-inter text-[10px] font-medium text-[#606060]">Tamanho Emb.</label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          placeholder="Ex: 1,5"
                          value={curInsumoTamanho}
                          onChange={e => setCurInsumoTamanho(e.target.value)}
                          className="h-8 w-full rounded border border-[#e0e0e0] bg-white px-2 text-center font-inter text-xs outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm"
                        />
                      </div>

                      <div className="flex w-[60px] flex-col gap-1">
                        <label className="font-inter text-[10px] font-medium text-[#606060]">Qtde. Emb.</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Ex: 2"
                          value={curInsumoQtde}
                          onChange={e => setCurInsumoQtde(e.target.value)}
                          className={`h-8 w-full rounded border ${formErrors.qtde ? 'border-red-500' : 'border-[#e0e0e0]'} bg-white px-2 text-center font-inter text-xs outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm`}
                        />
                      </div>

                      <div className="flex w-[90px] flex-col gap-1">
                        <label className="font-inter text-[10px] font-medium text-[#606060]">Custo Un. (R$)</label>
                        <input
                          type="text"
                          placeholder="Ex: 5,00"
                          value={curInsumoValor}
                          onChange={e => setCurInsumoValor(e.target.value)}
                          className={`h-8 w-full rounded border ${formErrors.valor ? 'border-red-500' : 'border-[#e0e0e0]'} bg-white px-2 text-center font-inter text-xs outline-none focus:border-[#F84910] transition-fluid focus:shadow-sm`}
                        />
                      </div>

                      <button
                        onClick={handleAddInsumo}
                        disabled={curInsumoNome === '' || curInsumoValor === ''}
                        className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[linear-gradient(149deg,#F84910_0%,#FF6838_100%)] px-3 text-white transition-fluid hover-scale shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="font-plus-jakarta text-[11px] font-bold text-white">Adicionar</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="mt-4 flex w-full justify-between gap-3 px-2">
                  {editingEntrada && (
                    <button
                      onClick={() => {
                        setDeleteAction(() => () => {
                          // REMOÇÃO PERMANENTE DO INSUMO (Conforme solicitado)
                          setInsumosList(insumosList.filter(i => i.nome !== editingEntrada.razao));
                          setEntradasList(entradasList.filter(e => e.id !== editingEntrada.id));
                          setIsAddModalOpen(false);
                          setEditingEntrada(null);
                          setShowDeleteModal(false);
                        });
                        setShowDeleteModal(true);
                      }}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[rgba(186,0,0,0.1)] px-4 font-plus-jakarta text-sm font-semibold tracking-wide text-[#BA0000] hover:bg-[#BA0000] hover:text-white transition-fluid"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      <span>Excluir Registro</span>
                    </button>
                  )}
                  <button
                    onClick={handleSaveProduto}
                    disabled={!isFormValid}
                    className={`flex h-10 items-center justify-center gap-2 rounded-lg px-6 transition-fluid hover-scale shadow-md ${isFormValid ? 'bg-[#36BA6F] cursor-pointer' : 'bg-[rgba(139,139,139,0.2)] cursor-not-allowed'}`}
                  >
                    <span className={`font-plus-jakarta text-sm font-semibold transition-fluid ${isFormValid ? 'text-[#BDFFDA]' : 'text-[#8B8B8B]'}`}>
                      Salvar e Atualizar
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors duration-300 ${isFormValid ? 'text-[#BDFFDA]' : 'text-[#8B8B8B]'}`}>
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in" onMouseDown={() => { setShowDeleteModal(false); setDeleteAction(null); setInsumoToRemoveId(null); }}>
          <div className="relative flex w-full max-w-[380px] flex-col items-center gap-5 rounded-xl border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300" onMouseDown={e => e.stopPropagation()}>
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
            </div>
            <div className="text-center">
              <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">Tem certeza?</h3>
              <p className="font-inter text-sm text-[#606060] mt-1">
                {deleteAction
                  ? `Esta ação removerá permanentemente este registro e todos os dados vinculados a ele.`
                  : "Deseja realmente remover este insumo desta entrada?"}
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteAction(null); setInsumoToRemoveId(null); }}
                className="flex-1 h-11 rounded-lg bg-gray-100 font-plus-jakarta text-sm font-bold text-[#606060] hover:bg-gray-200 transition-fluid cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={deleteAction}
                onMouseDown={() => {
                  setNotification({ title: 'Cancelado!', message: 'O registro de entrada foi cancelado com sucesso.', type: 'info' });
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
