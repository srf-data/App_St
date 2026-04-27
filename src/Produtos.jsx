import React, { useState, useEffect } from 'react';
import { cleanNotificationMessage, formatBRNumber } from './utils/validators';
import { productSchema, formatZodError } from './utils/validators';

export default function Produtos({ 
  fetchProdutos, fetchInsumos, fetchEntradas, produtosList, setProdutosList, insumosList, setInsumosList, fornecedoresList, entradasList, setEntradasList, saidasList, setSaidasList, isAddModalOpen, setIsAddModalOpen, searchQuery, dashboardFilter, clearFilter, setNotification 
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [editingProduto, setEditingProduto] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [insumoIndexToDelete, setInsumoIndexToDelete] = useState(null);

  const [loading, setLoading] = useState(false);
  
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
  
  const today = new Date().toLocaleDateString('pt-BR');

  const [nomeProduto, setNomeProduto] = useState('');
  const [qtdeInicial, setQtdeInicial] = useState('0');
  const [insumosAdicionados, setInsumosAdicionados] = useState([]);
  
  const [curInsumoId, setCurInsumoId] = useState('');
  const [curInsumoQtde, setCurInsumoQtde] = useState('1');
  const [curInsumoUnidade, setCurInsumoUnidade] = useState('');
  const [curInsumoPreco, setCurInsumoPreco] = useState('');

  const [precoVenda, setPrecoVenda] = useState('0');
  const [comissaoPorcentagem, setComissaoPorcentagem] = useState('0');
  const [lucroPorcentagem, setLucroPorcentagem] = useState('120'); // Valor padrão 120%

  const unidadesBase = {
    'ml': 1, 'ml.': 1, 'mililitro': 1, 'mililitros': 1,
    'l': 1000, 'l.': 1000, 'litro': 1000, 'litros': 1000,
    'g': 1, 'grama': 1, 'gramas': 1,
    'kg': 1000, 'quilo': 1000, 'quilos': 1000, 'kilo': 1000,
    'un': 1, 'unid': 1, 'unidade': 1, 'unidades': 1,
    '100ml': 100
  };

  const getFactor = (unit) => {
    if (!unit) return 1;
    const u = unit.toLowerCase().trim().replace('.', '');
    if (u === 'kg' || u === 'l' || u === 'litro' || u === 'quilo' || u === 'litros' || u === 'quilos') return 1000;
    if (u === 'g' || u === 'ml' || u === 'grama' || u === 'unid' || u === 'unidade' || u === 'un' || u === 'mililitro') return 1;
    if (u === '100ml') return 100;
    return 1;
  };

  const getCompatibleUnits = (baseUnit) => {
    if (!baseUnit) return [];
    const b = baseUnit.toLowerCase().trim().replace('.', '');
    if (b === 'kg' || b === 'g' || b === 'grama' || b === 'quilo') return ['kg', 'g'];
    if (b === 'l' || b === 'litro' || b === 'ml') return ['L', 'ml'];
    if (b === '100ml' || b === 'ml') return ['100ml', 'ml'];
    if (b === 'unid' || b === 'unidade' || b === 'un') return ['unid'];
    return [baseUnit];
  };

  const availableUnits = getCompatibleUnits(insumosList.find(i => i.id.toString() === curInsumoId)?.unidade);

  // Notification State

  const [formErrors, setFormErrors] = useState({});

  const ITEMS_PER_PAGE = 20;

  const filteredProdutos = produtosList.filter(p => 
    p.nome.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    p.id.toString().includes(searchQuery || '')
  );

  const filteredByDashboard = [...filteredProdutos].filter(p => {
    if (dashboardFilter === 'hoje') {
      if (!p.dataCad) return false;
      if (p.dataCad.includes('-')) {
        const [y, m, d] = p.dataCad.split('-');
        return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}` === today;
      }
      return p.dataCad === today;
    }
    return true;
  });

  const sortedProdutos = [...filteredByDashboard].sort((a, b) => b.id - a.id);

  const totalPages = Math.ceil(sortedProdutos.length / ITEMS_PER_PAGE) || 1;
  const paginatedProdutos = sortedProdutos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const calculateProportionalCost = (precoInsumo, unitInsumo, qtdUsada, unitUsada) => {


    const factorInsumo = getFactor(unitInsumo);
    const factorUsado = getFactor(unitUsada);
    
    const pricePerBaseUnit = Number(precoInsumo) / factorInsumo;
    const qtyInBaseUnit = Number(qtdUsada) * factorUsado;
    
    return qtyInBaseUnit * pricePerBaseUnit;
  };

  const getDynamicCostNum = (produto) => {
    const rawCost = (produto.insumos || []).reduce((total, item) => {
      const currentInsumo = insumosList.find(i => i.id.toString() === item.id.toString());
      const priceToUse = currentInsumo ? currentInsumo.custoUnitario : (item.custoUnitario || 0);
      const unitInsumo = currentInsumo ? currentInsumo.unidade : (item.originalUnit || item.unidade);
      
      const proportionalCost = calculateProportionalCost(priceToUse, unitInsumo, item.qtde, item.unidade);
      return total + proportionalCost;
    }, 0);

    if (rawCost === 0 && produto.custo) {
        return parseFloat(String(produto.custo).replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;
    }
    return rawCost;
  };

  const currentCustoProducao = insumosAdicionados.reduce((sum, item) => {
    const currentInsumo = insumosList.find(i => i.id.toString() === item.id.toString());
    const priceToUse = currentInsumo ? currentInsumo.custoUnitario : (item.custoUnitario || 0);
    const unitInsumo = currentInsumo ? currentInsumo.unidade : (item.originalUnit || item.unidade);
    return sum + calculateProportionalCost(priceToUse, unitInsumo, item.qtde, item.unidade);
  }, 0);

  const calculatePriceFromProfit = (profitPct, commPct, costProd) => {
    const ll = (parseFloat(profitPct) || 0) / 100;
    const cp = parseFloat(costProd) || 0;
    const com = (parseFloat(commPct) || 0) / 100;

    const numerator = (ll + 1) * cp * (1 - com);
    const denominator = 1 - (ll + 1) * com;

    if (denominator <= 0) return 0;
    return numerator / denominator;
  };

  const calculateProfitFromPrice = (priceVal, commPct, costProd) => {
    const pv = parseFloat(priceVal) || 0;
    const cp = parseFloat(costProd) || 0;
    const com = (parseFloat(commPct) || 0) / 100;

    const comissaoValor = (pv - cp) * com;
    const custoTotal = cp + comissaoValor;

    if (custoTotal <= 0) return 0;
    return (pv / custoTotal - 1) * 100;
  };

  useEffect(() => {
    // Se estivermos editando e o preço já veio do banco (seja por vendaNum ou string),
    // respeitamos o valor do banco e não sobrescrevemos.
    const rawVenda = editingProduto ? String(editingProduto.venda || '0') : '0';
    const parsedVenda = parseFloat(rawVenda.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    const savedPrice = editingProduto?.vendaNum || parsedVenda;

    if (editingProduto && 
        precoVenda === String(savedPrice) && 
        savedPrice > 0) {
       return; 
    }

    // Se o usuário já alterou o preço manualmente, não queremos sobrescrever.
    // O useEffect só deve agir se o preço atual ainda for o "padrão" ou zero.
    const calculated = calculatePriceFromProfit(lucroPorcentagem, comissaoPorcentagem, currentCustoProducao);
    if (calculated > 0) {
      setPrecoVenda(calculated.toFixed(2));
    }
  }, [currentCustoProducao, comissaoPorcentagem, lucroPorcentagem]);

  const handlePriceChange = (val) => {
    setPrecoVenda(val);
    const newProfit = calculateProfitFromPrice(val, comissaoPorcentagem, currentCustoProducao);
    setLucroPorcentagem(newProfit.toFixed(2));
  };

  const handleProfitPctChange = (val) => {
    setLucroPorcentagem(val);
    const newPrice = calculatePriceFromProfit(val, comissaoPorcentagem, currentCustoProducao);
    setPrecoVenda(newPrice.toFixed(2));
  };

  const handleAddInsumo = () => {
    if (!curInsumoId) return;
    const requestedQtde = parseFloat(curInsumoQtde) || 1;
    if (requestedQtde <= 0) return;
    const insumo = insumosList.find(i => i.id.toString() === curInsumoId);
    if (insumo) {
      const selectedPrice = curInsumoPreco ? parseFloat(curInsumoPreco) : insumo.custoUnitario;
      const usageUnit = curInsumoUnidade || insumo.unidade;
      
      const proportionalCost = calculateProportionalCost(selectedPrice, insumo.unidade, requestedQtde, usageUnit);

      const existingIdx = insumosAdicionados.findIndex(i => i.id.toString() === insumo.id.toString());
      const factorInsumo = getFactor(insumo.unidade);
      const factorUsado = getFactor(usageUnit);
      
      const requestedInBase = requestedQtde * factorUsado;
      const existingInBase = existingIdx !== -1 ? (insumosAdicionados[existingIdx].qtde * getFactor(insumosAdicionados[existingIdx].unidade)) : 0;
      
      const prodQty = parseFloat(qtdeInicial) || 0;
      const totalRequestedInBasePerUnit = requestedInBase + existingInBase;
      const totalNeededInBase = totalRequestedInBasePerUnit * (prodQty || 1);
      
      const stockInBase = (insumo.estoqueAtual || 0) * factorInsumo;

      if (Math.round(totalNeededInBase * 10000) / 10000 > Math.round(stockInBase * 10000) / 10000) {
        const stockDisplay = insumo.estoqueAtual;
        const stockUnit = insumo.unidade;
        const totalNeededDisplay = (totalRequestedInBasePerUnit / factorUsado).toFixed(2).replace(/\.?0+$/, '');
        setNotification({ 
          title: 'Limite de Estoque Excedido', 
          message: `Para produzir ${prodQty || 1} unidades, você precisa de um total de ${totalNeededDisplay}${usageUnit} de ${insumo.nome}, mas o estoque é de apenas ${stockDisplay}${stockUnit}.` 
        });
        return;
      }
      
      
      if (existingIdx !== -1) {
          const newList = [...insumosAdicionados];
          const item = newList[existingIdx];
          
          // Converter a nova quantidade para a unidade que já está na lista
          const factorUsadoAgora = getFactor(usageUnit);
          const factorExistente = getFactor(item.unidade);
          const requestedInExistingUnit = (requestedQtde * factorUsadoAgora) / factorExistente;
          
          const newQtdeTotal = item.qtde + requestedInExistingUnit;
          
          newList[existingIdx] = {
              ...item,
              qtde: newQtdeTotal,
              valorProporcional: calculateProportionalCost(selectedPrice, insumo.unidade, newQtdeTotal, item.unidade)
          };
          setInsumosAdicionados(newList);
      } else {
          setInsumosAdicionados([...insumosAdicionados, { 
            ...insumo, 
            qtde: requestedQtde, 
            unidade: usageUnit, 
            custoUnitario: selectedPrice, // Agora guardamos o preço BRUTO por pacote (L, kg, etc)
            valorProporcional: proportionalCost,
            originalUnit: insumo.unidade
          }]);
      }
      setCurInsumoId(''); setCurInsumoQtde('1'); setCurInsumoUnidade(''); setCurInsumoPreco(''); setNotification(null);
    }
  };

  const updateInsumoQtde = (index, delta) => {
    const newList = [...insumosAdicionados];
    const item = newList[index];
    const newQtde = item.qtde + delta;
    if (newQtde <= 0) return;
    
    // Pegamos os dados ATUAIS do insumo da lista global para garantir o estoque mais recente
    const insumoReal = insumosList.find(i => i.id.toString() === item.id.toString());
    const estoqueAtualReal = insumoReal ? insumoReal.estoqueAtual : (item.estoqueAtual || 0);

    const factorInsumo = getFactor(item.originalUnit || item.unidade);
    const factorUsado = getFactor(item.unidade);
    
    const prodQty = parseFloat(qtdeInicial) || 0;
    const totalNeededInBase = (newQtde * (prodQty || 1)) * factorUsado;
    const stockInBase = estoqueAtualReal * factorInsumo;

    if (delta > 0 && totalNeededInBase > stockInBase) {
      setNotification({ 
        title: 'Limite de Estoque Excedido', 
        message: `Para produzir ${prodQty || 1} unidades, você precisa de ${newQtde * (prodQty || 1)}${item.unidade}, mas o estoque de ${item.nome} é de apenas ${estoqueAtualReal}${item.originalUnit || item.unidade}.` 
      });
      return;
    }

    const priceToUse = insumoReal ? insumoReal.custoUnitario : (item.custoUnitario || 0);
    const unitInsumo = insumoReal ? insumoReal.unidade : (item.originalUnit || item.unidade);
    
    newList[index] = {
      ...item,
      qtde: newQtde,
      valorProporcional: calculateProportionalCost(priceToUse, unitInsumo, newQtde, item.unidade)
    };
    
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

  const handleSaveProduto = async () => {
    if (loading) return;
    setLoading(true);
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
    const qtdNum = parseFloat(qtdeInicial) || 0;
    
    const payload = {
        nome: nomeProduto,
        qtde: qtdNum,
        custoProduto: currentCustoProducao,
        precoVenda: parseFloat(String(precoVenda).replace(',', '.')) || 0,
        comissaoPorcentagem: parseFloat(String(comissaoPorcentagem).replace(',', '.')) || 0,
        insumos: insumosAdicionados
    };

    console.log("[DEBUG] Payload final para salvamento:", payload);

    try {
      if (editingProduto) {
        console.log("[DEBUG] Enviando Payload PUT Produto:", payload);
        const res = await fetch(`/api/produtos/${editingProduto.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!res.ok) {
           const errBody = await res.json().catch(()=>({}));
           throw new Error(errBody.details || errBody.error || "Erro ao atualizar");
        }
        if (fetchProdutos) await fetchProdutos();
        if (fetchInsumos) await fetchInsumos();
        
        setNotification({ title: 'Sucesso!', message: 'Produto atualizado com sucesso!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        setEditingProduto(null);
        setIsAddModalOpen(false);
      } else {
        const res = await fetch('/api/produtos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!res.ok) {
           const errBody = await res.json().catch(()=>({}));
           throw new Error(errBody.details || errBody.error || "Erro ao salvar");
        }
        if (fetchEntradas) await fetchEntradas();

        setNotification({ title: 'Sucesso!', message: 'Produto cadastrado com sucesso!', type: 'success' });
        setTimeout(() => { setNotification(null); setIsAddModalOpen(false); }, 1500);
        if (fetchProdutos) await fetchProdutos();
        if (fetchInsumos) await fetchInsumos();
      }
    } catch (e) {
      console.error(e);
      setNotification({ title: 'Erro', message: cleanNotificationMessage(e.message) || 'Falha na comunicação com o servidor', type: 'error' });
      setLoading(false);
      return; // Do not clear the form on error
    } finally {
      setLoading(false);
    }

    setNomeProduto(''); 
    setQtdeInicial('0'); 
    setInsumosAdicionados([]);
    setPrecoVenda('0');
    setComissaoPorcentagem('0');
    setLucroPorcentagem('120');
  };

  const clearForm = () => {
    setNomeProduto(''); 
    setQtdeInicial('0'); 
    setInsumosAdicionados([]);
    setPrecoVenda('0');
    setComissaoPorcentagem('0');
    setLucroPorcentagem('120');
    setEditingProduto(null);
    setSelectedProduto(null);
    setFormErrors({});
  };

  const handleDeleteProduct = (produto) => {
    setProductToDelete(produto);
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      const res = await fetch(`/api/produtos/${productToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (fetchProdutos) await fetchProdutos();
        
        if (setEntradasList) setEntradasList(prev => prev.filter(e => e.razao !== productToDelete.nome));
        if (setSaidasList) setSaidasList(prev => prev.filter(s => s.produto !== productToDelete.nome));
        
        setNotification({ title: 'Excluído!', message: 'O produto foi removido com sucesso.', type: 'info' });
        setTimeout(() => setNotification(null), 3000);
        setShowDeleteModal(false);
        setProductToDelete(null);
        setEditingProduto(null);
        setIsAddModalOpen(false);
      }
    } catch(e) {
      console.error(e);
      setNotification({ title: 'Erro', message: cleanNotificationMessage(e.message) || 'Falha ao deletar Produto', type: 'error' });
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleOpenEdit = (produto) => {
    setEditingProduto(produto); 
    setNomeProduto(produto.nome);
    setQtdeInicial(produto.qtd || 0);
    setInsumosAdicionados(produto.insumos || []); 
    
    // Tenta pegar o valor numérico, se não conseguir, limpa a string do preço
    const rawVenda = String(produto.venda || '0');
    const parsedVenda = parseFloat(rawVenda.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
    const savedVendaNum = produto.vendaNum || parsedVenda;
    const savedComissao = produto.comissaoPorcentagem || 0;

    console.log(`[EDIT] Produto: ${produto.nome} | VendaNum: ${produto.vendaNum} | VendaStr: ${produto.venda} | Final: ${savedVendaNum}`);

    setComissaoPorcentagem(String(savedComissao));
    setPrecoVenda(String(savedVendaNum));
    
    // Calcular o lucro % atual baseado no preço e custo salvos
    const currentCost = getDynamicCostNum(produto);
    const profit = calculateProfitFromPrice(savedVendaNum, savedComissao, currentCost);
    setLucroPorcentagem(profit.toFixed(2));

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

      <div className="min-w-[1120px] flex flex-col gap-2.5">
        {/* Table Header */}
        <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
          <div className="w-[80px] text-center">Código</div>
          <div className="flex-1 w-[auto] max-w-none text-left px-4">Nome do Produto</div>
          <div className="w-[120px] text-center">Receita (Cálculo)</div>
          <div className="w-[130px] text-center">Quant. Cadastrada</div>
          <div className="w-[110px] text-center">Custo Prod.</div>
          <div className="w-[100px] text-center">Preço Venda</div>
          <div className="w-[100px] text-center">Comissão (R$)</div>
          <div className="w-[100px] text-center">Lucro (R$)</div>
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
                
                <div className="flex-1 w-[auto] max-w-none text-left px-4 truncate text-[#0D0D0D] font-semibold uppercase">{produto.nome || '-'}</div>
                
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
                    return (
                      <div className="flex flex-col items-center">
                        <span>R$ {dynamicCost.toFixed(2).replace('.', ',')}</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="w-[100px] text-center text-[#36BA6F] font-semibold">{produto.venda || '-'}</div>
                <div className="w-[100px] text-center text-orange-500 font-medium">
                    {(() => {
                      const cp = getDynamicCostNum(produto);
                      const rawVenda = String(produto.venda || '0');
                      const parsedVenda = parseFloat(rawVenda.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
                      const pv = produto.vendaNum || parsedVenda;
                      const comPct = produto.comissaoPorcentagem || 0;
                      const comVal = (pv - cp) * (comPct / 100);
                      return <span>R$ {comVal.toFixed(2).replace('.', ',')}</span>;
                    })()}
                </div>
                <div className="w-[100px] text-center">
                    {(() => {
                      const cp = getDynamicCostNum(produto);
                      const rawVenda = String(produto.venda || '0');
                      const parsedVenda = parseFloat(rawVenda.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
                      const pv = produto.vendaNum || parsedVenda;
                      const comPct = produto.comissaoPorcentagem || 0;
                      
                      const comVal = (pv - cp) * (comPct / 100);
                      const profitValue = pv - cp - comVal;
                      return <span className={`font-bold ${profitValue >= 0 ? 'text-[#36BA6F]' : 'text-red-500'}`}>R$ {profitValue.toFixed(2).replace('.', ',')}</span>;
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
                  ? `Esta ação removerá permanentemente o produto "${(productToDelete.nome || '').toUpperCase()}" e todo o seu histórico de entradas e saídas.`
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
                 <h4 className="font-plus-jakarta text-sm font-semibold text-[#0D0D0D] uppercase">{selectedProduto.nome}</h4>
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
                      <div className="w-[100px] text-left text-[#0D0D0D] truncate uppercase" title={ins.nome}>{ins.nome}</div>
                      <div className="w-[100px] text-center">{Number(ins.qtde).toFixed(2).replace(/\.?0+$/, '')} {ins.unidade}</div>
                      <div className="w-[140px] text-center">R$ {(ins.custoUnitario || 0).toFixed(2).replace('.', ',')}</div>
                      <div className="w-[100px] text-center font-bold text-[#36BA6F]">R$ {(ins.valorProporcional || calculateProportionalCost(ins.custoUnitario, ins.originalUnit || ins.unidade, ins.qtde, ins.unidade)).toFixed(2).replace('.', ',')}</div>
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
                  Custo de Produção Total: <span className="text-[#36BA6F]">R$ {
                    (selectedProduto.insumos || []).reduce((acc, ins) => {
                      const currentInsumo = insumosList.find(i => i.id.toString() === ins.id.toString());
                      const priceToUse = currentInsumo ? currentInsumo.custoUnitario : (ins.custoUnitario || 0);
                      const unitInsumo = currentInsumo ? currentInsumo.unidade : (ins.originalUnit || ins.unidade);
                      return acc + calculateProportionalCost(priceToUse, unitInsumo, ins.qtde, ins.unidade);
                    }, 0).toFixed(2).replace('.', ',')
                  }</span>
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
          onMouseDown={() => { setIsAddModalOpen(false); clearForm(); }}
        >
          <div 
            className="relative flex w-full max-w-[700px] flex-col gap-4 rounded-lg border border-[#F0F0F3] bg-white p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto table-scrollbar"
            onMouseDown={e => e.stopPropagation()}
          >
            
            <div className="flex h-[40px] w-full items-center justify-between border-b border-[#F0F0F3] pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[rgba(248,73,16,0.1)] text-[#F84910]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">
                   {editingProduto ? 'Editar Produto' : 'Cadastrar Produto'}
                </h3>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); clearForm(); }} className="flex size-8 items-center justify-center rounded-full text-[#606060] hover:bg-gray-100 transition-fluid cursor-pointer hover:rotate-90">
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
                    min="0"
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
                      <div className="flex-1 px-4 text-left font-bold truncate text-[#0D0D0D] uppercase">{ins.nome}</div>
                      <div className="w-[80px] text-center text-[#F84910] font-bold">{Number(ins.qtde).toFixed(2).replace(/\.?0+$/, '')}</div>
                      <div className="w-[80px] text-center font-bold text-[#606060]">{ins.unidade}</div>
                      <div className="w-[100px] text-center font-bold text-[#36BA6F]">R$ {(ins.valorProporcional || 0).toFixed(2).replace('.', ',')}</div>
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
                            {(i.nome.charAt(0).toUpperCase() + i.nome.slice(1))} - R$ {(i.custoUnitario || 0).toFixed(2).replace('.', ',')} (Estoque: {Number(i.estoqueAtual).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {i.unidade})
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

            <div className="mt-6 border-t border-[#F0F0F3] pt-5 flex flex-col gap-5">
              <h4 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">Precificação Inteligente</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[rgba(248,73,16,0.03)] p-5 rounded-xl border border-[rgba(248,73,16,0.08)]">
                {/* Custo de Produção (Leitura) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#606060] uppercase">Custo de Produção</label>
                  <div className="h-11 flex items-center px-4 bg-white border border-[#F0F0F3] rounded-lg font-inter font-bold text-[#0D0D0D]">
                    R$ {currentCustoProducao.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                {/* Comissão (%) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#606060] uppercase">Comissão (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={comissaoPorcentagem} 
                      onChange={(e) => setComissaoPorcentagem(e.target.value)}
                      className="h-11 w-full bg-white border border-[#F0F0F3] rounded-lg px-4 font-inter font-bold text-[#0D0D0D] outline-none focus:border-[#F84910] text-center"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#606060]">%</span>
                  </div>
                  <span className="text-[10px] text-[#606060] mt-0.5 ml-1">
                    Valor: R$ {((parseFloat(precoVenda) - currentCustoProducao) * (parseFloat(comissaoPorcentagem) / 100)).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Lucro Líquido (%) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#606060] uppercase">Lucro Desejado (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={lucroPorcentagem} 
                      onChange={(e) => handleProfitPctChange(e.target.value)}
                      className="h-11 w-full bg-white border border-[#F0F0F3] rounded-lg px-4 font-inter font-bold text-[#36BA6F] outline-none focus:border-[#36BA6F] text-center"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#36BA6F]">%</span>
                  </div>
                </div>

                {/* Preço de Venda (Editável e Calculado) */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#606060] uppercase">Preço de Venda Final</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#F84910]">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={precoVenda} 
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="h-12 w-full bg-white border-2 border-[#F84910] rounded-lg pl-10 pr-4 font-inter text-lg font-black text-[#F84910] outline-none shadow-sm"
                    />
                  </div>
                </div>

                {/* Lucro em R$ (Visualização) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#606060] uppercase">Lucro Líquido (R$)</label>
                  <div className="h-12 flex items-center justify-center bg-[#36BA6F] rounded-lg font-inter text-lg font-black text-white shadow-md">
                    R$ {(parseFloat(precoVenda) - currentCustoProducao - ((parseFloat(precoVenda) - currentCustoProducao) * (parseFloat(comissaoPorcentagem) / 100))).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>

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
                  disabled={!isFormValid || loading}
                  className={`flex h-11 items-center justify-center gap-3 rounded-lg px-8 font-plus-jakarta text-sm font-semibold tracking-wide transition-fluid hover-scale shadow-md ${isFormValid && !loading ? 'bg-[#36BA6F] text-[#BDFFDA] cursor-pointer' : 'bg-[#F0F0F3] text-[#BEBEBE] cursor-not-allowed opacity-60'}`}
                >
                  <span>{loading ? 'Processando...' : (editingProduto ? 'Salvar Alterações' : 'Salvar Produto')}</span>
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

