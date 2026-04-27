import React, { useState, useEffect } from 'react';
import { userSchema, formatZodError } from './utils/validators';
import PaginaInicial from './PaginaInicial';
import Produtos from './Produtos';
import Entradas from './Entradas';
import MateriasPrimas from './MateriasPrimas';
import Fornecedores from './Fornecedores';
import Saidas from './Saidas';
import logoUrl from './assets/logo-pagina.png';
import studioSolartLogo from './assets/studio-solart.jpg';
import avatarDefault from './assets/avatar-tabela.svg';

const initialInsumos = [];
const initialProdutos = [];
const initialEntradas = [];
const initialSaidas = [];
const initialFornecedores = [];

const iconMap = {
  'Página Inicial': (
    <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.66663 23.3335V19.3335M15.3333 23.3335V11.3335M22 23.3335V18.0002" />
      <path d="M28.6666 7.3335C28.6666 9.54263 26.8758 11.3335 24.6666 11.3335C22.4574 11.3335 20.6666 9.54263 20.6666 7.3335C20.6666 5.12436 22.4574 3.3335 24.6666 3.3335C26.8758 3.3335 28.6666 5.12436 28.6666 7.3335Z" />
      <path d="M28.6607 14.6668C28.6607 14.6668 28.6667 15.1195 28.6667 16.0002C28.6667 21.9714 28.6667 24.9568 26.8118 26.8119C24.9567 28.6668 21.9711 28.6668 16 28.6668C10.0289 28.6668 7.04336 28.6668 5.18836 26.8119C3.33337 24.9568 3.33337 21.9714 3.33337 16.0002C3.33337 10.0291 3.33337 7.04352 5.18836 5.18852C7.04336 3.33354 10.0289 3.33354 16 3.33354L17.3334 3.3335" />
    </svg>
  ),
  'Produtos': (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  ),
  'Matérias-primas': (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
    </svg>
  ),
  'Fornecedores': (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  'Entradas': (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"></path>
      <polyline points="16 10 12 14 8 10"></polyline>
      <line x1="12" y1="2" x2="12" y2="14"></line>
    </svg>
  ),
  'Saídas': (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"></path>
      <polyline points="16 6 12 2 8 6"></polyline>
      <line x1="12" y1="2" x2="12" y2="14"></line>
    </svg>
  ),
  'Usuários': (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  )
};

export default function Users({ onLogout, currentUser }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('Página Inicial');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingEntrada, setIsAddingEntrada] = useState(false);
  const [isAddingProduto, setIsAddingProduto] = useState(false);
  const [isAddingMateriaPrima, setIsAddingMateriaPrima] = useState(false);
  const [isAddingFornecedor, setIsAddingFornecedor] = useState(false);
  const [isAddingSaida, setIsAddingSaida] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = React.useRef(null);
  const [newNome, setNewNome] = useState('');
  const [newConfirmEmail, setNewConfirmEmail] = useState('');
  const [newConfirmSenha, setNewConfirmSenha] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [notification, setNotification] = useState(null);

  const [produtosList, setProdutosList] = useState([]);
  const [insumosList, setInsumosList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [entradasList, setEntradasList] = useState([]);
  const [saidasList, setSaidasList] = useState([]);
  const [saidaInsumosList, setSaidaInsumosList] = useState([]);
  const [fornecedoresList, setFornecedoresList] = useState([]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);


  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsAddingUser(false);
        setEditingUser(null);
        setShowDeleteConfirm(false);
        setIsAddingEntrada(false);
        setIsAddingProduto(false);
        setIsAddingMateriaPrima(false);
        setIsAddingFornecedor(false);
        setIsAddingSaida(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  let loggedUser = (usuariosList && usuariosList.length > 0) 
    ? (usuariosList.find(u => u.id === currentUser?.id || u.nome === currentUser?.nome) || currentUser)
    : currentUser;

  if (loggedUser && loggedUser.nome === 'Studio Solart' && !loggedUser.foto) {
    loggedUser = { ...loggedUser, foto: studioSolartLogo };
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setNotification({ title: 'Erro de Arquivo', message: 'Por favor, selecione apenas arquivos de imagem.', type: 'error' });
        return;
      }
      
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
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
        setNewImage(file);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const [loading, setLoading] = useState(false);

  const handleSaveUser = async () => {
    if (loading) return;
    const dataToValidate = {
      nome: newNome,
      email: newEmail,
      confirmEmail: newConfirmEmail,
      senha: newSenha,
      confirmSenha: newConfirmSenha,
    };

    const result = userSchema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = formatZodError(result.error);
      setFormErrors(errors);
      setNotification({
        title: 'Erro de Validação',
        message: 'Por favor, corrija os erros no formulário.',
        type: 'error'
      });
      return;
    }

    setFormErrors({});

    const payload = {
      nome: newNome,
      email: newEmail,
      senha: newSenha,
      foto: imagePreview
    };

    try {
      const url = editingUser 
        ? `/api/usuarios/${editingUser.id}` 
        : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao salvar usuário.');
      }
      
      setLoading(true);
      await fetchUsuarios();
      setNotification({ 
        title: 'Sucesso!', 
        message: editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!', 
        type: 'success' 
      });
      setTimeout(() => { setNotification(null); setIsAddingUser(false); }, 1500);
      setEditingUser(null);
      if (!editingUser) setCurrentPage(1);
    } catch (error) {
      console.error(error);
      setNotification({ title: 'Erro ao Salvar', message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }

    setIsAddingUser(false);
    setNewNome(''); setNewEmail(''); setNewSenha(''); setNewConfirmEmail(''); setNewConfirmSenha(''); setNewImage(null); setImagePreview(null);
  };

  const clearForm = () => {
    setNewNome(''); setNewEmail(''); setNewSenha(''); setNewConfirmEmail(''); setNewConfirmSenha(''); setNewImage(null); setImagePreview(null);
    setEditingUser(null);
    setFormErrors({});
  };

  const handleDeleteUser = (user) => {
    setEditingUser(user);
    setNewNome(user.nome); 
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (editingUser) {
      try {
        const res = await fetch(`/api/usuarios/${editingUser.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao remover usuário.');

        const isSelfDeletion = editingUser.id === currentUser?.id;

        await fetchUsuarios();
        setNotification({ title: 'Excluído!', message: 'O usuário foi removido com sucesso.', type: 'info' });
        
        if (isSelfDeletion) {
          setNotification({ title: 'Sessão Encerrada', message: 'Sua conta foi excluída. Saindo...', type: 'warning' });
          setTimeout(() => {
            onLogout();
          }, 1500);
          return;
        }

        setTimeout(() => setNotification(null), 3000);
        setShowDeleteConfirm(false);
        setIsAddingUser(false);
        setEditingUser(null);
        setNewNome(''); setNewEmail(''); setNewSenha(''); setNewImage(null); setImagePreview(null);
      } catch (error) {
        console.error(error);
        setNotification({ title: 'Erro ao Excluir', message: error.message, type: 'error' });
      }
    }
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setNewNome(user.nome);
    setNewEmail(user.email);
    setNewConfirmEmail(user.email);
    setNewSenha('');
    setNewConfirmSenha('');
    setImagePreview(user.foto);
    setIsAddingUser(true);
    setFormErrors({});
  };


  const fetchFornecedores = async () => {
    try {
      const res = await fetch('/api/fornecedores');
      if (res.ok) {
        const data = await res.json();
        setFornecedoresList(data);
      }
    } catch (e) {
      console.error('Failed to fetch fornecedores', e);
    }
  };

  const fetchInsumos = async () => {
    try {
      const res = await fetch('/api/insumos');
      if (res.ok) {
        const data = await res.json();
        console.log('[DEBUG] Insumos recebidos do servidor:', data.map(i => ({ id: i.id, nome: i.nome, temFoto: !!i.foto, lenFoto: i.foto?.length || 0 })));
        setInsumosList(data);
      }
    } catch (e) {
      console.error('Failed to fetch insumos', e);
    }
  };

  const fetchProdutos = async () => {
    try {
      const res = await fetch('/api/produtos');
      if (res.ok) {
        const data = await res.json();
        setProdutosList(data);
      }
    } catch (e) {
      console.error('Failed to fetch produtos', e);
    }
  };

  const fetchEntradas = async () => {
    try {
      const res = await fetch('/api/entradas');
      if (res.ok) {
        const data = await res.json();
        setEntradasList(data);
      }
    } catch (e) {
      console.error('Failed to fetch entradas', e);
    }
  };

  const fetchSaidas = async () => {
    try {
      const res = await fetch('/api/saidas/produtos');
      if (res.ok) {
        const data = await res.json();
        setSaidasList(data);
      }
    } catch (e) {
      console.error('Failed to fetch saidas produtos', e);
    }
  };

  const fetchSaidaInsumos = async () => {
    try {
      const res = await fetch('/api/saidas/insumos');
      if (res.ok) {
        const data = await res.json();
        setSaidaInsumosList(data);
      }
    } catch (e) {
      console.error('Failed to fetch saidas insumos', e);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuariosList(data);
      }
    } catch (e) {
      console.error('Failed to fetch usuarios', e);
    }
  };

  useEffect(() => {
    fetchFornecedores();
    fetchInsumos();
    fetchProdutos();
    fetchEntradas();
    fetchSaidas();
    fetchSaidaInsumos();
    fetchUsuarios();
  }, []);

  const [dashboardFilter, setDashboardFilter] = useState(null);

  const isFormValid = newNome.trim() !== '' && newEmail.trim() !== '' && newSenha.trim() !== '';

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const ITEMS_PER_PAGE = 20;

  const filteredUsers = usuariosList.filter(u => (u.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  const menuItems = [
    { title: 'Página Inicial', section: '' },
    { type: 'section', title: 'GERENCIAMENTO' },
    { title: 'Produtos' },
    { title: 'Matérias-primas' },
    { title: 'Fornecedores' },
    { type: 'section', title: 'MOVIMENTAÇÃO' },
    { title: 'Entradas' },
    { title: 'Saídas' },
    { type: 'section', title: 'ADMINISTRAÇÃO' },
    { title: 'Usuários' },
  ];
  return (
    <div className="flex min-h-screen bg-[#FDFDFE] md:bg-white overflow-hidden">
      {/* Transparent Spacer to keep layout flow */}
      <div className={`shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-[270px] max-[860px]:w-[88px]' : 'w-[88px]'}`} />

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 flex h-full flex-col justify-between border-r border-[#F0F0F3] bg-white py-4 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[270px] px-6 max-[860px]:shadow-2xl' : 'w-[88px] px-4'}`}>

        {/* Floating Toggle Arrow (on aside, outside overflow-hidden) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
          className="absolute -right-[13px] top-[26px] flex size-[26px] cursor-pointer items-center justify-center rounded-full border border-[#F0F0F3] bg-white shadow-md transition-all duration-300 hover:scale-105 z-20 text-[#606060]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BEBEBE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex flex-col gap-4 overflow-hidden relative">

          <div className="flex h-[52px] w-full items-center overflow-hidden">
            <div className="flex items-center gap-0 overflow-hidden">
              <img src={logoUrl} alt="Logo" className="size-[52px] shrink-0" />
              <span className={`font-plus-jakarta font-extrabold text-[19px] tracking-[-1.179px] text-[#0D0D0D] transition-all duration-300 origin-left ${isSidebarOpen ? 'w-auto opacity-100 scale-100' : 'w-0 opacity-0 scale-50'}`}>
                st.solart
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-4">
            {menuItems.map((item, index) => {
              if (item.type === 'section') {
                return (
                  <h3
                    key={index}
                    className={`mt-6 px-2 font-inter text-xs sm:text-sm font-[1000] font-medium tracking-wider text-[#D7D7D7] transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0 mb-[-24px] pr-0'}`}
                  >
                    {item.title}
                  </h3>
                );
              }

              const isActive = activeMenu === item.title;
              return (
                <div
                  key={index}
                  onClick={() => {
                    setActiveMenu(item.title);
                    setDashboardFilter(null);
                  }}
                  className={`group flex h-[33px] cursor-pointer items-center rounded-lg px-2 transition-fluid overflow-hidden active:scale-95 ${isActive ? 'bg-[#FAFAFA] text-[#F84910]' : 'text-[#606060] hover:bg-gray-50'} ${isSidebarOpen ? 'gap-4 justify-start' : 'gap-0 justify-center'}`}
                >
                  <div className={`size-4 shrink-0 transition-fluid ${isActive ? 'text-[#F84910]' : 'text-[#606060] group-hover:text-[#F84910]'}`}>
                    {iconMap[item.title]}
                  </div>
                  <span className={`font-inter font-medium transition-all duration-300 whitespace-nowrap overflow-hidden ${isSidebarOpen ? 'w-auto opacity-100 text-sm delay-100' : 'w-0 opacity-0 text-[0px]'} ${isActive ? 'text-[#F84910]' : 'text-[#606060] group-hover:text-[#F84910]'}`}>
                    {item.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-white">
        <header className="flex min-h-[84px] w-full flex-col justify-center gap-4 border-b border-[#F0F0F3] px-8 py-4 min-[860px]:flex-row min-[860px]:items-center min-[860px]:justify-between min-[860px]:gap-0">
          <div className="flex w-full items-center justify-end gap-4 order-1 min-[860px]:order-2 min-[860px]:w-auto">
            <span className="hidden min-[860px]:block font-inter text-base font-semibold text-[#0D0D0D]">Olá, {loggedUser?.nome || (currentUser?.nome || 'Usuário')}</span>
            <img src={loggedUser?.foto || avatarDefault} alt="Perfil" className="size-[34px] rounded-full object-cover shrink-0 transition-fluid hover:scale-110 border border-[#F0F0F3]" />
            <button onClick={onLogout} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="flex h-[34px] w-[90px] cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-[#F84910] to-[#FF6838] transition-fluid hover-scale shadow-sm">
              <span className="font-plus-jakarta text-sm font-semibold text-white">Sair</span>
            </button>
          </div>

          <div className="flex items-center gap-3 order-2 min-[860px]:order-1">
            <div className="flex size-[56px] items-center justify-center shrink-0 rounded-2xl bg-white shadow-sm border border-[#F0F0F3] text-[#BEBEBE] [&>svg]:size-5">
              {iconMap[activeMenu] || iconMap['Página Inicial']}
            </div>
            <div className="flex flex-col gap-1 transition-all">
              <h2 className="font-inter text-base font-semibold text-[#0D0D0D] transition-all">{activeMenu}</h2>
              <p className="font-inter text-sm font-medium text-[#606060] transition-all overflow-hidden text-ellipsis whitespace-nowrap">
                {activeMenu === 'Página Inicial' ? 'Visão Geral do Controle de Estoque' : `Seção de ${activeMenu}`}
              </p>
            </div>
          </div>
        </header>

        <div className="flex w-full flex-col p-8 pt-10 transition-fluid anim-fade-in relative">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2 transition-all">
              <h1 className="font-plus-jakarta text-[32px] font-extrabold leading-[40px] text-[#0D0D0D]">
                {activeMenu === 'Página Inicial'
                  ? 'Dashboard'
                  : activeMenu === 'Usuários'
                    ? 'Gestão de Usuários'
                    : activeMenu === 'Produtos'
                      ? 'Gestão de Produtos'
                      : activeMenu === 'Entradas'
                        ? 'Registro de Entradas'
                        : activeMenu === 'Saídas'
                          ? 'Gestão de Saídas'
                          : `Gestão de ${activeMenu}`}
              </h1>
              <p className="font-inter text-sm font-medium text-[#606060] leading-[17px]">
                {activeMenu === 'Página Inicial'
                  ? 'Monitore desempenho, controle custos e tome decisões estratégicas com base nos dados do seu negócio.'
                  : activeMenu === 'Usuários'
                    ? 'Gerencie acessos, defina níveis de permissão e mantenha o controle total sobre a equipe.'
                    : activeMenu === 'Produtos'
                      ? 'Acompanhe seu fluxo de produtos detalhado e calcule insumos instantaneamente.'
                      : activeMenu === 'Entradas'
                        ? 'Controle todas as movimentações de entrada e garanta precisão no seu estoque.'
                        : activeMenu === 'Matérias-primas'
                          ? 'Visualize e gerencie todos os insumos utilizados na sua produção de forma organizada e eficiente.'
                          : activeMenu === 'Fornecedores'
                            ? 'Gerencie seus fornecedores, contatos e condições de compra centralizadamente.'
                            : activeMenu === 'Saídas'
                              ? 'Registro Organizado de Saídas e controle de entregas.'
                              : 'Módulo em construção...'}
              </p>
            </div>
            {activeMenu !== 'Página Inicial' && (
              <div className="flex items-center gap-2 shrink-0">
                <div className={`relative flex items-center transition-all duration-500 ease-in-out ${isSearchExpanded ? 'w-[200px] h-[32px] rounded-lg border border-[#D7D7D740] border-opacity-20 bg-white' : 'w-[32px] h-[32px] bg-transparent'}`}>
                  {isSearchExpanded && (
                    <input
                      type="text"
                      autoFocus
                      placeholder="Digite aqui..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                      className="absolute inset-0 h-full w-[calc(100%-32px)] bg-transparent pl-3 pr-2 text-xs border-none font-inter text-[#0D0D0D] placeholder:text-[#606060] focus:ring-0 focus:outline-none"
                    />
                  )}
                  <span
                    role="button"
                    onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                    style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none', appearance: 'none' }}
                    className="absolute right-0 flex size-[32px] cursor-pointer items-center justify-center rounded-lg border-2 border-[#F84910] bg-transparent text-[#F84910] transition-[background-color,color,transform,opacity,width] duration-300 hover:border-transparent hover:text-white hover:bg-[linear-gradient(270deg,#F84910_0%,#FF6838_100%)] hover:bg-[length:200%_200%] hover:animate-[gradient_2s_ease_infinite] active:scale-95"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                </div>

                <button
                  onClick={() =>
                    activeMenu === 'Usuários' ? setIsAddingUser(!isAddingUser) :
                      activeMenu === 'Produtos' ? setIsAddingProduto(true) :
                        activeMenu === 'Entradas' ? setIsAddingEntrada(true) :
                          activeMenu === 'Matérias-primas' ? setIsAddingMateriaPrima(true) :
                            activeMenu === 'Fornecedores' ? setIsAddingFornecedor(true) :
                              activeMenu === 'Saídas' ? setIsAddingSaida(true) :
                                setActiveMenu('Entradas')
                  }
                  style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                  className="flex h-[34px] items-center justify-center gap-2 rounded-lg bg-[linear-gradient(149deg,#F84910_0%,#FF6838_100%)] px-4 font-plus-jakarta text-sm font-semibold text-white shadow-[0_0_15px_rgba(248,73,16,0.3)] transition-fluid hover-scale cursor-pointer"
                >
                  <span className="flex items-center justify-center">
                    {activeMenu === 'Usuários' ? 'Novo Usuário' : activeMenu === 'Produtos' ? 'Adicionar Produto' : activeMenu === 'Entradas' ? 'Adicionar Entrada' : activeMenu === 'Matérias-primas' ? 'Cadastrar Matéria-Prima' : activeMenu === 'Fornecedores' ? 'Cadastrar Fornecedor' : activeMenu === 'Saídas' ? 'Registrar Saída' : 'Novo Registro'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            )}
          </div>

          {activeMenu === 'Página Inicial' ? (
            <PaginaInicial
              produtos={produtosList}
              insumos={insumosList}
              entradas={entradasList}
              saidas={saidasList}
              saidasInsumos={saidaInsumosList}
              onNavigate={(menu, filter) => {
                setActiveMenu(menu);
                setDashboardFilter(filter);
              }}
            />
          ) : activeMenu === 'Usuários' ? (
            <div className="flex w-full flex-col gap-2.5 rounded-lg border border-[#F0F0F3] bg-white p-2.5 shadow-[0_0_20px_rgba(139,139,139,0.03)] transition-all overflow-x-auto table-scrollbar relative anim-fade-in">
              <div className="min-w-[1020px] flex flex-col gap-2.5">
                <div className="flex h-[35px] w-full items-center justify-between rounded-lg bg-[rgba(215,215,215,0.2)] px-4 font-inter text-xs font-medium text-[#606060]">
                  <div className="w-[80px] text-center">Código</div>
                  <div className="w-[75px] text-center">Foto</div>
                  <div className="flex-1 w-[auto] max-w-none text-left px-4">Nome</div>
                  <div className="flex-1 w-[auto] max-w-none text-left px-4">E-mail</div>
                  <div className="w-[120px] text-center">Senha</div>
                  <div className="w-[180px] text-center">Data de Cadastro</div>
                  <div className="w-[180px] text-center">Último Acesso</div>
                  <div className="w-[60px] text-center">Ações</div>
                </div>

                {isAddingUser && (
                  <div className="flex flex-col gap-4 p-4 bg-[#FAFAFA] rounded-lg border border-[#F0F0F3] mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(248,73,16,0.1)] text-[#F84910]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {editingUser ? (
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          ) : (
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm10 0v6m-3-3h6" />
                          )}
                        </svg>
                      </div>
                      <h3 className="font-plus-jakarta text-base font-bold text-[#0D0D0D]">
                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                      </h3>
                    </div>


                    <div className="flex flex-col gap-6">
                      {/* Primeira Linha: Nome, E-mail, Senha */}
                      <div className="flex w-full items-start justify-between px-2 gap-4">
                        <div className="w-[80px]" />
                        <div className="w-[75px] flex flex-col items-center">
                          <label className="block text-[10px] font-bold text-[#F84910] mb-2 uppercase">Foto</label>
                          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
                          <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center p-0.5 rounded-lg shrink-0 w-[50px] h-[34px] border border-dashed border-[#F84910] hover:bg-[#F84910]/10 transition group overflow-hidden" title={newImage ? newImage.name : "Upload"}>
                            {imagePreview ? (
                              <img src={imagePreview} className="w-full h-full object-cover rounded" />
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F84910" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            )}
                          </button>
                        </div>

                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-[#F84910] mb-2 ml-1 uppercase">Nome Completo</label>
                          <input type="text" placeholder="Nome" value={newNome} onChange={e => setNewNome(e.target.value)} className={`w-full h-[36px] bg-white border ${formErrors.nome ? 'border-red-500' : 'border-[#F0F0F3]'} rounded-lg px-3 outline-none text-[#0D0D0D] font-medium focus:border-gray-300`} />
                          {formErrors.nome && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.nome}</p>}
                        </div>

                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-[#F84910] mb-2 ml-1 uppercase">E-mail</label>
                          <input type="email" placeholder="E-mail" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={`w-full h-[36px] bg-white border ${formErrors.email ? 'border-red-500' : 'border-[#F0F0F3]'} rounded-lg px-3 outline-none text-[#0D0D0D] font-medium focus:border-gray-300`} />
                          {formErrors.email && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.email}</p>}
                        </div>

                        <div className="w-[120px]">
                          <label className="block text-[10px] font-bold text-[#F84910] mb-2 ml-1 uppercase text-center">Senha</label>
                          <input type="password" placeholder={editingUser ? "Manter atual" : "Senha"} value={newSenha} onChange={e => setNewSenha(e.target.value)} className={`w-full h-[36px] bg-white border ${formErrors.senha ? 'border-red-500' : 'border-[#F0F0F3]'} rounded-lg px-2 outline-none text-[#0D0D0D] text-center font-medium focus:border-gray-300`} />
                          {formErrors.senha && <p className="text-[10px] text-red-500 mt-1 text-center">{formErrors.senha}</p>}
                        </div>
                      </div>

                      {/* Segunda Linha: Confirmações */}
                      <div className="flex w-full items-start justify-between px-2 gap-4">
                        <div className="w-[80px]" />
                        <div className="w-[75px]" />

                        <div className="flex-1 invisible">
                          <label className="block text-[10px] mb-2">Spacer</label>
                          <div className="h-[36px]" />
                        </div>

                        <div className="flex-1">
                          <label className="block text-[10px] font-medium text-[#606060] mb-2 ml-1 uppercase opacity-70">Confirmar E-mail</label>
                          <input type="email" placeholder="Confirmar E-mail" value={newConfirmEmail} onChange={e => setNewConfirmEmail(e.target.value)} className={`w-full h-[36px] bg-white border ${formErrors.confirmEmail ? 'border-red-500' : 'border-[#F0F0F3]'} rounded-lg px-3 outline-none text-[#0D0D0D] font-medium focus:border-gray-300`} />
                          {formErrors.confirmEmail && <p className="text-[10px] text-red-500 mt-1 ml-1">{formErrors.confirmEmail}</p>}
                        </div>

                        <div className="w-[120px]">
                          <label className="block text-[10px] font-medium text-[#606060] mb-2 ml-1 uppercase text-center opacity-70">Confirmar Senha</label>
                          <input type="password" placeholder={editingUser ? "Manter atual" : "Confirmar Senha"} value={newConfirmSenha} onChange={e => setNewConfirmSenha(e.target.value)} className={`w-full h-[36px] bg-white border ${formErrors.confirmSenha ? 'border-red-500' : 'border-[#F0F0F3]'} rounded-lg px-2 outline-none text-[#0D0D0D] text-center font-medium focus:border-gray-300`} />
                          {formErrors.confirmSenha && <p className="text-[10px] text-red-500 mt-1 text-center">{formErrors.confirmSenha}</p>}
                        </div>
                      </div>

                      <div className="flex w-full justify-between px-4 mt-2">
                        <div>
                          {editingUser && (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="flex h-[36px] items-center gap-2 px-4 rounded-lg font-plus-jakarta text-sm font-bold text-[#BA0000] hover:bg-red-50 transition-fluid cursor-pointer"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
                              Excluir Usuário
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setIsAddingUser(false);
                              clearForm();
                            }}
                            className="font-inter text-sm font-medium text-[#606060] hover:text-[#0D0D0D] transition-colors mr-2 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveUser}
                            disabled={loading}
                            className={`flex h-11 items-center justify-center gap-3 rounded-lg px-8 font-plus-jakarta text-sm font-semibold tracking-wide transition-fluid hover-scale shadow-md ${!loading ? 'bg-[#36BA6F] text-[#BDFFDA] cursor-pointer' : 'bg-[#F0F0F3] text-[#BEBEBE] cursor-not-allowed opacity-60'}`}
                          >
                            <span>{loading ? 'Processando...' : 'Salvar Registro'}</span>
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

                {paginatedUsers.length === 0 ? (
                  <div className="flex h-[100px] w-full items-center justify-center font-inter text-sm font-medium text-[#606060] bg-white rounded-lg">
                    Ainda não há usuários cadastrados além da conta base.
                  </div>
                ) : (
                  paginatedUsers.map((user) => (
                    <div key={user.id} className="flex h-[50px] w-full items-center justify-between rounded-lg bg-white px-4 font-inter text-xs font-medium text-[#606060] transition-colors hover:bg-slate-50 border-b border-[#F0F0F3] last:border-0">
                      <div className="w-[80px] text-center text-[#0D0D0D]">{user.id || '-'}</div>
                      <div className="w-[75px] flex justify-center">
                        <img src={user.foto || (user.nome === 'Studio Solart' ? studioSolartLogo : avatarDefault)} alt="Avatar" className="h-[34px] w-[34px] object-cover rounded-full border border-[#F0F0F3]" />
                      </div>
                      <div className="flex-1 w-[auto] max-w-none text-left px-4 text-[#0D0D0D] truncate">{user.name || user.nome || '-'}</div>
                      <div className="flex-1 w-[auto] max-w-none text-left px-4 truncate">{user.email || '-'}</div>
                      <div className="w-[120px] text-center font-mono text-[10px] tracking-widest opacity-40">••••••••</div>
                      <div className="w-[180px] text-center">{user.dataCad || '-'}</div>
                      <div className="w-[180px] text-center">{user.ultimoAcc || '-'}</div>
                      <div className="w-[60px] flex justify-center">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          className="flex size-7 items-center justify-center rounded-lg bg-[#D7D7D740] text-[#606060] hover:bg-[#F84910] hover:text-white transition-fluid cursor-pointer hover-scale"
                          title="Editar Usuário"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div className="flex h-[48px] w-full items-center justify-between border-t border-[#F0F0F3] px-2 pt-2 mt-2">
                  <div className="font-inter text-xs font-medium text-[#606060]">
                    {filteredUsers.length} registros encontrados.
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white">
                    <button
                      onClick={handlePrevPage}
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
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`flex size-6 items-center justify-center rounded cursor-pointer transition-fluid ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeMenu === 'Produtos' ? (
            <Produtos
              fetchProdutos={fetchProdutos}
              fetchInsumos={fetchInsumos}
              fetchEntradas={fetchEntradas}
              produtosList={produtosList}
              setProdutosList={setProdutosList}
              insumosList={insumosList}
              setInsumosList={setInsumosList}
              fornecedoresList={fornecedoresList}
              entradasList={entradasList}
              setEntradasList={setEntradasList}
              saidasList={saidasList}
              setSaidasList={setSaidasList}
              isAddModalOpen={isAddingProduto}
              setIsAddModalOpen={setIsAddingProduto}
              searchQuery={searchQuery}
              dashboardFilter={dashboardFilter}
              clearFilter={() => setDashboardFilter(null)}
              setNotification={setNotification}
            />

          ) : activeMenu === 'Entradas' ? (
            <Entradas
              entradasList={entradasList}
              setEntradasList={setEntradasList}
              produtosList={produtosList}
              setProdutosList={setProdutosList}
              insumosList={insumosList}
              setInsumosList={setInsumosList}
              fornecedoresList={fornecedoresList}
              fetchEntradas={fetchEntradas}
              fetchInsumos={fetchInsumos}
              fetchProdutos={fetchProdutos}
              isAddModalOpen={isAddingEntrada}
              setIsAddModalOpen={setIsAddingEntrada}
              searchQuery={searchQuery}
              setNotification={setNotification}
            />

          ) : activeMenu === 'Matérias-primas' ? (
            <MateriasPrimas
              fetchInsumos={fetchInsumos}
              fetchEntradas={fetchEntradas}
              fetchProdutos={fetchProdutos}
              insumosList={insumosList}
              setInsumosList={setInsumosList}
              fornecedoresList={fornecedoresList}
              entradasList={entradasList}
              setEntradasList={setEntradasList}
              saidaInsumosList={saidaInsumosList}
              setSaidaInsumosList={setSaidaInsumosList}
              produtosList={produtosList}
              setProdutosList={setProdutosList}
              isAddModalOpen={isAddingMateriaPrima}
              setIsAddModalOpen={setIsAddingMateriaPrima}
              searchQuery={searchQuery}
              dashboardFilter={dashboardFilter}
              clearFilter={() => setDashboardFilter(null)}
              setNotification={setNotification}
            />

          ) : activeMenu === 'Fornecedores' ? (
            <Fornecedores
              fetchFornecedores={fetchFornecedores}
              isAddModalOpen={isAddingFornecedor}
              setIsAddModalOpen={setIsAddingFornecedor}
              searchQuery={searchQuery}
              fornecedoresList={fornecedoresList}
              setFornecedoresList={setFornecedoresList}
              insumosList={insumosList}
              setInsumosList={setInsumosList}
              produtosList={produtosList}
              setProdutosList={setProdutosList}
              setNotification={setNotification}
            />

          ) : activeMenu === 'Saídas' ? (
            <Saidas
              saidasList={saidasList}
              setSaidasList={setSaidasList}
              saidaInsumosList={saidaInsumosList}
              setSaidaInsumosList={setSaidaInsumosList}
              produtosList={produtosList}
              setProdutosList={setProdutosList}
              insumosList={insumosList}
              setInsumosList={setInsumosList}
              fetchSaidas={fetchSaidas}
              fetchSaidaInsumos={fetchSaidaInsumos}
              fetchProdutos={fetchProdutos}
              fetchInsumos={fetchInsumos}
              isAddModalOpen={isAddingSaida}
              setIsAddModalOpen={setIsAddingSaida}
              searchQuery={searchQuery}
              setNotification={setNotification}
            />

          ) : (
            <div className="flex w-full flex-col items-center justify-center py-20 text-[#606060] bg-white border border-[#F0F0F3] rounded-lg">
              <p className="animate-pulse text-lg text-center">Painel dinâmico da seção {activeMenu} entrará aqui.</p>
              <div className="mt-4 h-2 w-24 rounded-full bg-gray-200" />
            </div>
          )}
        </div>
        {notification && (
          <div className={`fixed bottom-8 left-8 z-[500] flex w-full max-w-[440px] items-start gap-4 rounded-xl border bg-white p-6 shadow-[0_12px_45px_rgba(0,0,0,0.1)] animate-in slide-in-from-left-10 duration-500 overflow-hidden ${notification.type === 'success' ? 'border-green-100' : notification.type === 'error' ? 'border-red-100' : 'border-blue-100'}`}>
            <div className={`absolute top-0 left-0 h-full w-1.5 ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
            <div className={`flex size-6 shrink-0 items-center justify-center rounded-full mt-0.5 ${notification.type === 'success' ? 'bg-green-100 text-green-600' : notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {notification.type === 'success' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : notification.type === 'error' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 pr-4 text-left">
              <h4 className="font-plus-jakarta text-sm font-bold text-[#0D0D0D]">{notification.title}</h4>
              <p className="font-inter text-[13px] text-[#606060] leading-relaxed font-medium">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 text-[#8B8B8B] transition-fluid"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}
      </main>


      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-sm p-4 anim-fade-in" onMouseDown={() => { setShowDeleteConfirm(false); setEditingUser(null); }}>
          <div className="relative flex w-full max-w-[380px] flex-col items-center gap-5 rounded-xl border border-[#F0F0F3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300" onMouseDown={e => e.stopPropagation()}>
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
            </div>
            <div className="text-center">
              <h3 className="font-plus-jakarta text-lg font-bold text-[#0D0D0D]">Tem certeza?</h3>
              <p className="font-inter text-sm text-[#606060] mt-1">
                Deseja realmente remover o usuário <span className="font-bold text-[#0D0D0D]">{newNome}</span>? Esta ação não poderá ser desfeita.
              </p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setEditingUser(null); }}
                className="flex-1 h-11 rounded-lg bg-gray-100 font-plus-jakarta text-sm font-bold text-[#606060] hover:bg-gray-200 transition-fluid cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 h-11 rounded-lg bg-[#BA0000] font-plus-jakarta text-sm font-bold text-white hover:bg-red-700 transition-fluid shadow-md hover-scale cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
