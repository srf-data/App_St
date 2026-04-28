import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PaginaInicial({ produtos = [], insumos = [], entradas = [], saidas = [], saidasInsumos = [], onNavigate }) {
  const [tab, setTab] = useState('Semana');
  const [chartTypeFilter, setChartTypeFilter] = useState('produtos'); // 'produtos' ou 'insumos'
  const [customDay, setCustomDay] = useState(''); // 'YYYY-MM-DD'
  const [showMenuInvestimento, setShowMenuInvestimento] = useState(false);
  const [filtroInvestimento, setFiltroInvestimento] = useState('Semana');

  const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-white/40 bg-white/85 p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-md animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full shadow-sm" style={{ backgroundColor: data.color || payload[0].color }} />
          <p className="font-plus-jakarta text-[11px] font-semibold uppercase tracking-wider text-[#8B8B8B]">{data.name}</p>
        </div>
        <p className="font-plus-jakarta text-lg font-extrabold text-[#0D0D0D]">
          {formatBRL(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-white/40 bg-white/85 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
        <p className="font-plus-jakarta text-[13px] font-extrabold text-[#0D0D0D] border-b border-gray-100 pb-2">{label}</p>
        <div className="flex flex-col gap-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-plus-jakarta text-[11px] font-semibold text-[#606060]">{entry.name}</span>
              </div>
              <span className="font-plus-jakarta text-[12px] font-black text-[#0D0D0D]">{formatBRL(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

  const parseDateString = (str) => {
    if (!str || typeof str !== 'string') return new Date();
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  };

  const isInRange = (dateStr, rangeType, customV) => {
    const date = parseDateString(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (rangeType === 'CustomDay' && customDay) {
      const [y, m, d] = customDay.split('-').map(Number);
      const target = new Date(y, m - 1, d);
      return date.getTime() === target.getTime();
    }

    if (rangeType === 'Dia') {
      return date.getTime() === now.getTime();
    }

    if (rangeType === 'Semana') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return date >= sevenDaysAgo && date <= now;
    }

    if (rangeType === 'Mês') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }

    return true;
  };

  const todayStr = new Date().toLocaleDateString('pt-BR');
  const totalItensHoje = [...produtos, ...insumos].filter(item => {
    if (!item.dataCad) return false;
    // Handle both YYYY-MM-DD and DD/MM/YYYY
    if (item.dataCad.includes('-')) {
      const [y, m, d] = item.dataCad.split('-');
      return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}` === todayStr;
    }
    return item.dataCad === todayStr;
  }).length;
  
  const insumosMinimo = insumos.filter(i => (i.estoqueAtual || 0) > 0 && (i.estoqueAtual || 0) <= 5);
  const insumosZerado = insumos.filter(i => (i.estoqueAtual || 0) <= 0);

  const getInvestStats = () => {
    const range = customDay ? 'CustomDay' : filtroInvestimento;
    
    // Investimento: Entradas de Insumos no período (Compras de Matéria-prima)
    const investTotal = entradas
      .filter(e => e.fornecedor !== 'Produção Própria')
      .filter(e => isInRange(e.entrada, range))
      .reduce((sum, e) => {
        const val = parseFloat(String(e.total || e.valor).replace('R$', '').replace('.', '').replace(',', '.')) || 0;
        return sum + val;
      }, 0);

    // Lucro Real = Vendas (Faturamento) - Custo de Produção daqueles itens
    const lucroTotal = saidas
      .filter(s => isInRange(s.data, range))
      .reduce((sum, s) => {
        const totalVenda = parseFloat(String(s.total).replace('R$', '').replace('.', '').replace(',', '.')) || 0;
        
        // Buscar o produto para saber o custo de produção dele
        const prod = produtos.find(p => p.id === s.produtoId);
        // O campo 'custo' no frontend vem formatado como "R$ 10,00", precisamos limpar
        const custoUnitario = prod ? parseFloat(String(prod.custo).replace('R$', '').replace('.', '').replace(',', '.')) : 0;
        const custoTotalProducao = (Number(s.qtde) || 0) * custoUnitario;
        
        return sum + (totalVenda - custoTotalProducao);
      }, 0);

    return { investTotal, lucroTotal };
  };

  const { investTotal, lucroTotal } = getInvestStats();

  const dataInvestimentos = [
    { name: 'Investimento (Insumos)', value: investTotal, color: '#F84910' },
    { name: 'Margem de Lucro', value: lucroTotal, color: '#8AF1B9' },
  ];

  const getChartData = () => {
    const range = customDay ? 'CustomDay' : tab;
    
    // Entradas de Produtos (Produção)
    const entProd = entradas.filter(e => e.fornecedor === 'Produção Própria' && isInRange(e.entrada, range));
    // Entradas de Insumos (Compras)
    const entIns = entradas.filter(e => e.fornecedor !== 'Produção Própria' && isInRange(e.entrada, range));
    
    // Saídas de Produtos (Vendas)
    const saiProd = saidas.filter(s => isInRange(s.data, range));
    // Saídas de Insumos (Baixas Manuais)
    const saiInsMan = saidasInsumos.filter(s => isInRange(s.data, range));

    const getVal = (item) => {
      const vStr = item.total || item.valor || '0';
      return parseFloat(String(vStr).replace('R$', '').replace('.', '').replace(',', '.')) || 0;
    };

    const getInsumoManualExitCost = (s) => {
      // Se tiver valor salvo, usa. Senão, busca o custo unitário atual do insumo pelo nome
      const v = getVal(s);
      if (v > 0) return v;
      const ins = insumos.find(i => i.nome === s.produto || i.nome === s.nome);
      const custo = ins ? (parseFloat(String(ins.custoUnitario || 0).replace(',', '.')) || 0) : 0;
      return (parseFloat(s.qtde) || 0) * custo;
    };

    let finalEntradas = [];
    let finalSaidas = [];

    if (chartTypeFilter === 'produtos') {
      finalEntradas = entProd;
      finalSaidas = saiProd;
    } else {
      // Para Insumos: 
      // Entrada = Compras
      // Saída = Baixas Manuais + Custo Consumido na Produção (que é o 'total' das entradas de produtos)
      finalEntradas = entIns;
      finalSaidas = [...saiInsMan, ...entProd]; 
    }

    const processItem = (item, isAltInsExit = false) => {
      if (chartTypeFilter === 'insumos' && !item.fornecedor && !isAltInsExit) {
        // É uma saída manual de insumo
        return getInsumoManualExitCost(item);
      }
      return getVal(item);
    };

    const aggregate = (dataList, dateKey, isEntrada = true) => {
      const map = {};
      dataList.forEach(item => {
        const d = item[dateKey] || item.data || item.entrada;
        const val = (isEntrada || chartTypeFilter === 'produtos') ? getVal(item) : (item.fornecedor === 'Produção Própria' ? getVal(item) : getInsumoManualExitCost(item));
        map[d] = (map[d] || 0) + val;
      });
      return map;
    };

    if (range === 'Dia' || range === 'CustomDay') {
      const labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      const result = labels.map(l => ({ name: l, entradas: 0, saidas: 0 }));

      const getSlotIdx = (horaStr) => {
        if (!horaStr) return -1;
        const h = parseInt(horaStr.split(':')[0]);
        if (h < 8) return 0;
        if (h >= 20) return 6;
        return Math.floor((h - 8) / 2);
      };

      finalEntradas.forEach(e => {
        const idx = getSlotIdx(e.hora);
        if (idx !== -1) result[idx].entradas += getVal(e);
      });

      finalSaidas.forEach(s => {
        const idx = getSlotIdx(s.hora);
        const val = (chartTypeFilter === 'insumos') 
          ? (s.fornecedor === 'Produção Própria' ? getVal(s) : getInsumoManualExitCost(s))
          : getVal(s);
        if (idx !== -1) result[idx].saidas += val;
      });
      
      return result;
    }

    if (range === 'Semana') {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const result = days.map(d => ({ name: d, entradas: 0, saidas: 0 }));
      
      finalEntradas.forEach(e => {
        const dIdx = parseDateString(e.entrada || e.data).getDay();
        result[dIdx].entradas += getVal(e);
      });
      finalSaidas.forEach(s => {
        const dIdx = parseDateString(s.data || s.entrada).getDay();
        const val = (chartTypeFilter === 'insumos') 
          ? (s.fornecedor === 'Produção Própria' ? getVal(s) : getInsumoManualExitCost(s))
          : getVal(s);
        result[dIdx].saidas += val;
      });
      return result;
    }

    // Mês
    const result = [
      { name: 'Sem 1', entradas: 0, saidas: 0 },
      { name: 'Sem 2', entradas: 0, saidas: 0 },
      { name: 'Sem 3', entradas: 0, saidas: 0 },
      { name: 'Sem 4', entradas: 0, saidas: 0 },
    ];
    const getWeekIdx = (dateStr) => {
      const day = parseInt(dateStr.split('/')[0]);
      if (day <= 7) return 0;
      if (day <= 14) return 1;
      if (day <= 21) return 2;
      return 3;
    };

    finalEntradas.forEach(e => { result[getWeekIdx(e.entrada || e.data)].entradas += getVal(e); });
    finalSaidas.forEach(s => { 
      const val = (chartTypeFilter === 'insumos') 
        ? (s.fornecedor === 'Produção Própria' ? getVal(s) : getInsumoManualExitCost(s))
        : getVal(s);
      result[getWeekIdx(s.data || s.entrada)].saidas += val; 
    });

    return result;
  };

  const chartData = getChartData();

  return (
    <div className="flex w-full flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Resumo - Cards */}
      <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div className="flex flex-col justify-between rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-[0_0_20px_rgba(139,139,139,0.03)] min-h-[143px]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-gray-50 border border-gray-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-plus-jakarta text-sm font-semibold text-[#606060]">Itens Cadastrados (Hoje)</h3>
          </div>
          <div className="mt-4">
            <h2 className="font-plus-jakarta text-[22px] font-bold text-[#0D0D0D]">{totalItensHoje} {totalItensHoje === 1 ? 'Item' : 'Itens'}</h2>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-plus-jakarta text-[11px] font-medium text-[#8B8B8B]">Total de {(produtos.length + insumos.length)} itens em estoque</span>
              <button onClick={() => onNavigate('Produtos', 'hoje')} className="flex items-center gap-1 font-plus-jakarta text-xs font-medium text-[#F84910] hover:underline cursor-pointer">
                Ver Novos <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-[0_0_20px_rgba(139,139,139,0.03)] min-h-[143px]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-orange-50 border border-orange-100/50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="#F84910" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-plus-jakarta text-sm font-semibold text-[#606060]">Itens Críticos</h3>
          </div>
          <div className="mt-4">
            <h2 className="font-plus-jakarta text-[22px] font-bold text-[#0D0D0D]">{insumosMinimo.length} Insumos</h2>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-plus-jakarta text-[10px] text-[#8B8B8B]">Itens em alerta de reposição (item ≤ 5)</span>
              <button onClick={() => onNavigate('Matérias-primas', 'minimo')} className="flex items-center gap-1 font-plus-jakarta text-xs font-medium text-[#F84910] hover:underline cursor-pointer">
                Ver Insumos <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-red-200/50 bg-[rgba(186,0,0,0.03)] p-6 shadow-[0_0_20px_rgba(139,139,139,0.03)] min-h-[143px]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-white border border-red-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#BA0000" strokeWidth="2"/><path d="M15 9L9 15M9 9l6 6" stroke="#BA0000" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-plus-jakarta text-sm font-semibold text-[#BA0000]">Estoque Zerado</h3>
          </div>
          <div className="mt-4">
            <h2 className="font-plus-jakarta text-[22px] font-bold text-[#0D0D0D]">{insumosZerado.length} Insumos</h2>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-plus-jakarta text-[10px] text-[#BA0000] opacity-70">Necessita compra urgente</span>
              <button onClick={() => onNavigate('Matérias-primas', 'zerado')} className="flex items-center gap-1 font-plus-jakarta text-xs font-medium text-[#BA0000] hover:underline cursor-pointer">
                Ver Insumos <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col xl:flex-row gap-2.5">
        <div className="flex w-full flex-col rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-[0_0_20px_rgba(139,139,139,0.03)] xl:flex-[2]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              <h3 className="font-inter text-base font-semibold text-[#0D0D0D]">Entradas e Saídas</h3>
              <div className="flex bg-[#F0F0F3] p-1 rounded-lg gap-1 relative w-max">
                <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded shadow-sm transition-transform duration-300 ease-in-out ${chartTypeFilter === 'insumos' ? 'translate-x-full' : 'translate-x-0'}`}></div>
                <button onClick={() => setChartTypeFilter('produtos')} className={`relative w-[100px] py-1 text-[10px] font-semibold rounded z-10 uppercase tracking-widest ${chartTypeFilter === 'produtos' ? 'text-[#0D0D0D]' : 'text-[#8B8B8B]'}`}>Produtos</button>
                <button onClick={() => setChartTypeFilter('insumos')} className={`relative w-[100px] py-1 text-[10px] font-semibold rounded z-10 uppercase tracking-widest ${chartTypeFilter === 'insumos' ? 'text-[#0D0D0D]' : 'text-[#8B8B8B]'}`}>Insumos</button>
              </div>
            </div>
            
            <div className="flex items-end gap-3 sm:mt-0">
               <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[#8B8B8B] uppercase px-1">Data Específica</label>
                  <input type="date" value={customDay} onChange={e => { setCustomDay(e.target.value); setTab('CustomDay'); }} className="h-8 rounded-lg border border-[#e0e0e0] px-2 text-[11px] font-semibold text-[#606060] outline-none hover:border-[#F84910] bg-white transition-fluid" />
               </div>
               <div className="flex gap-1 bg-[#F0F0F3] p-1 rounded-lg h-8">
                {['Dia', 'Semana', 'Mês'].map(t => (
                  <button key={t} onClick={() => { setTab(t); setCustomDay(''); }} className={`rounded px-3 text-[11px] transition-all cursor-pointer ${tab === t ? 'bg-white text-[#1C1D21] font-bold shadow-sm' : 'text-[#606060]'}`}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8AF1B9" stopOpacity={0.8}/><stop offset="95%" stopColor="#8AF1B9" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F84910" stopOpacity={0.4}/><stop offset="95%" stopColor="#F84910" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#BEBEBE' }} axisLine={false} tickLine={false} />
                <YAxis 
                  width={80}
                  tick={{ fontSize: 11, fill: '#BEBEBE' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" name="Entrada" dataKey="entradas" stroke="#8AF1B9" strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" />
                <Area type="monotone" name="Saída" dataKey="saidas" stroke="#F84910" strokeWidth={2} fillOpacity={1} fill="url(#colorSaidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex w-full flex-col rounded-lg border border-[#F0F0F3] bg-white p-6 shadow-[0_0_20px_rgba(139,139,139,0.03)] xl:flex-[1]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 relative">
            <h3 className="font-inter text-base font-semibold text-[#0D0D0D]">Financeiro ({tab === 'CustomDay' ? 'Data Ref.' : tab})</h3>
            <button onClick={() => setShowMenuInvestimento(!showMenuInvestimento)} className="text-[#BEBEBE] hover:text-[#0D0D0D] rounded-full p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
            {showMenuInvestimento && (
              <div className="absolute right-0 top-8 z-[60] flex w-[120px] flex-col rounded-md border border-[#F0F0F3] bg-white p-1.5 shadow-lg">
                {['Dia', 'Semana', 'Mês'].map(item => <button key={item} onClick={() => { setFiltroInvestimento(item); setTab(item); setCustomDay(''); setShowMenuInvestimento(false); }} className={`rounded-md px-3 py-1.5 text-left text-xs ${filtroInvestimento === item ? 'bg-orange-50 text-[#F84910] font-bold' : 'text-[#606060] hover:bg-gray-50'}`}>{item}</button>)}
              </div>
            )}
          </div>
          <div className="h-[180px] w-full flex items-center justify-center relative mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={dataInvestimentos} 
                  innerRadius={65} 
                  outerRadius={85} 
                  paddingAngle={3} 
                  dataKey="value" 
                  stroke="none"
                >
                  {dataInvestimentos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="font-plus-jakarta text-lg font-extrabold text-[#0D0D0D] leading-none">{formatBRL(lucroTotal)}</span>
              <span className="font-plus-jakarta text-[10px] text-[#8B8B8B] text-center font-semibold mt-1">Lucro</span>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 px-2">
            {dataInvestimentos.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-inter text-[13px] font-medium text-[#606060]">{item.name}</span>
                </div>
                <span className="font-plus-jakarta text-[13px] font-bold text-[#0D0D0D]">{formatBRL(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
