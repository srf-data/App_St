import { useState, useEffect } from 'react'
import Users from './Users'

import bgImageLogin from './assets/login-bg.png'
import iconeBadge from './assets/badge.svg'
import iconeBox from './assets/icone-estoque.png'
import brandIcon from './assets/brand-logo-new.svg'
import loginVectors from './assets/login-vectors.svg'
import studioSolartLogo from './assets/studio-solart.jpg'

const initialFakeUsers = [
  {
    id: 1,
    nome: 'Studio Solart',
    email: 'admin@studiosolart.com',
    senha: 'admin',
    dataCad: '01/01/2026',
    ultimoAcc: '06/04/2026 - 15:40',
    foto: studioSolartLogo
  }
];

function App() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [loginPhase, setLoginPhase] = useState('login')
  const [fakeUsersList, setFakeUsersList] = useState(initialFakeUsers)
  const [currentUser, setCurrentUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [notification, setNotification] = useState(null)
  
  // Load credentials from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('solart_email');
    if (savedEmail) setUsername(savedEmail);
  }, []);

  const isFormValid = username.trim().length > 0 && (loginPhase === 'login' ? password.length > 0 : true);

  async function handleLogin(event) {
    event.preventDefault()
    setNotification(null)
    setIsProcessing(true)

    try {
      if (loginPhase === 'reset_password') {
        if (newPassword !== confirmPassword) {
          setNotification({
            title: 'Senhas não coincidem',
            message: 'As senhas digitadas nos campos "Nova Senha" e "Confirmar Senha" devem ser exatamente iguais.',
            type: 'error'
          });
          setIsProcessing(false)
          return;
        }

        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, otp: otpCode.join(''), newPassword })
        });
        
        const data = await response.json();
        if (response.ok) {
          setNotification({ title: 'Sucesso!', message: 'Sua senha foi redefinida com sucesso. Faça login agora.', type: 'success' });
          setLoginPhase('login');
          setOtpCode(['', '', '', '', '', '']);
          setOtpSent(false);
          setPassword('');
        } else {
          setNotification({ title: 'Erro', message: data.message || 'Erro ao redefinir senha.', type: 'error' });
        }
      } else {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, password })
        });

        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data.user);
          setIsLoggedIn(true);
          localStorage.setItem('solart_email', username);
          // Don't save password for security, just use the token/session
        } else {
          setNotification({ title: data.title || 'Erro', message: data.message || 'Verifique suas credenciais.', type: 'error' });
        }
      }
    } catch (error) {
      setNotification({ title: 'Erro de Conexão', message: 'Não foi possível conectar ao servidor.', type: 'error' });
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleSendOTP() {
    if (!username) {
       setNotification({ title: 'Atenção', message: 'Por favor, digite seu e-mail/usuário primeiro.' });
       return;
    }
    setIsProcessing(true);
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username })
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setNotification({ 
          title: 'Código Enviado!', 
          message: `Enviamos um código para seu e-mail. ${data.previewUrl ? `[DEBUG] Link do e-mail: ${data.previewUrl}` : ''}` 
        });
      } else {
        setNotification({ title: 'Erro', message: data.message });
      }
    } catch (e) {
      setNotification({ title: 'Erro', message: 'Erro ao enviar código.' });
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoggedIn && currentUser) {
    return (
      <Users 
        onLogout={() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
          // keep email in field for convenience
        }} 
        currentUser={currentUser}
        fakeUsersList={fakeUsersList}
        setFakeUsersList={setFakeUsersList}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF] p-4 md:p-5 flex items-center justify-center">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1448px] gap-4 min-[1161px]:grid-cols-[1.14fr_1fr] md:gap-5">
        <div className="relative hidden overflow-hidden rounded-2xl bg-white shadow-[0_4px_30px_rgba(0,0,0,0.03)] md:block h-[400px] min-[1161px]:h-full" aria-hidden="true">
          {/* Background Images and Gradients */}
          <div className="absolute inset-0 opacity-80 pointer-events-none">
            <img src={bgImageLogin} alt="" className="h-full w-full object-cover scaling-animation" />
          </div>

          {/* Decorative Vectors from Figma Frame 57 - Pinned to bottom */}
          <div className="absolute bottom-0 left-[-2%] w-[114%] pointer-events-none z-10 leading-[0]">
            <img src={loginVectors} alt="" className="w-full h-auto object-contain" />
          </div>

          <div className="absolute inset-x-8 bottom-16 flex flex-col items-center gap-4 text-center z-20">
            <div className="inline-flex rounded-full bg-gradient-to-r from-[#f77a4b] via-[#F34A55] to-[#E044E9] p-px">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f0dfd9] px-2 py-1">
                <img src={iconeBadge} alt="" className="size-4" />
                <span className="font-inter text-sm font-medium text-[#0D0D0D]">Controle de Estoque e Custos</span>
              </div>
            </div>

            <div className="w-full max-w-[520px]">
              <h1 className="font-plus-jakarta text-[40px] font-extrabold leading-[1.08] tracking-[-1.6px] text-[#3e3f45]">
                <span className="flex items-end justify-center gap-2 whitespace-nowrap">
                  <span>Gerencie sua</span>
                  <span className="relative top-2 inline-flex h-16 min-w-16 rotate-[-2deg]">
                    <img src={iconeBox} alt="" className="absolute inset-0 h-full w-full" />
                  </span>
                  <span>Producao</span>
                </span>
                <span className="block">com Inteligencia</span>
              </h1>
            </div>

            <p className="font-inter text-lg font-medium leading-normal text-[#5f5f5f]">
              Sistema de controle de estoque e precificacao para producao artesanal.
            </p>
          </div>
        </div>

        <div className="flex overflow-hidden rounded-2xl border border-gray-100 bg-[#FAFAFA] px-6 py-10 shadow-[0_4px_30px_rgba(0,0,0,0.03)] md:items-center md:justify-center md:px-8">
          <form
            className="mx-auto flex w-full max-w-[468px] flex-col items-center gap-8 rounded-2xl bg-[#FAFAFA] p-4 md:p-8"
            onSubmit={handleLogin}
          >
            <div className="flex flex-col items-center gap-2">
              <img src={brandIcon} alt="St. Solart" className="h-[30px] w-16" />
              <p className="font-plus-jakarta text-[26px] font-extrabold tracking-[-1.6px] text-[#021D48]">st.solart</p>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="font-inter text-[24px] font-semibold text-[#0d0d0d]">Entre com sua Conta</h2>
              <p className="max-w-[414px] font-inter text-sm font-medium text-[#606060]">
                Por favor, insira seus dados para entrar na sua conta.
              </p>
            </div>

            {notification && (
              <div className={`fixed bottom-8 left-8 z-[100] flex w-full max-w-[540px] items-start gap-4 rounded-xl border bg-white p-6 shadow-[0_12px_45px_rgba(0,0,0,0.1)] animate-in slide-in-from-left-10 duration-500 overflow-hidden ${notification.type === 'success' ? 'border-green-100' : 'border-red-100'}`}>
                <div className={`absolute top-0 left-0 h-full w-1.5 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className={`flex size-6 shrink-0 items-center justify-center rounded-full mt-0.5 ${notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                   {notification.type === 'success' ? (
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   ) : (
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                   )}
                </div>
                <div className="flex flex-1 flex-col gap-1 pr-4 text-left">
                  <h4 className="font-plus-jakarta text-sm font-bold text-[#0D0D0D]">{notification.title}</h4>
                  <p className="font-inter text-[13px] text-[#606060] leading-relaxed font-medium">{notification.message}</p>
                  {notification.message.includes('[DEBUG]') && (
                     <a href={notification.message.split('[DEBUG] Link do e-mail: ')[1]} target="_blank" rel="noreferrer" className="text-blue-500 underline text-xs mt-2 block">Ver E-mail de Teste</a>
                  )}
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

            {loginPhase === 'login' ? (
              <>
                <div className="flex w-full max-w-[380px] flex-col gap-2">
                  <label htmlFor="username" className="font-plus-jakarta text-sm font-semibold text-[#606060]">
                    Usuario
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu usuario"
                    className="h-13 w-full rounded-lg border border-[#f8f8f8] bg-white px-4 font-plus-jakarta text-base text-[#353535] placeholder:text-[#8b8b8b] focus:border-[#f84910] focus:outline-none"
                  />
                </div>

                <div className="flex w-full max-w-[380px] flex-col gap-2">
                  <label htmlFor="password" className="font-plus-jakarta text-sm font-semibold text-[#606060]">
                    Senha
                  </label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="h-13 w-full rounded-lg border border-[#f8f8f8] bg-white px-4 font-plus-jakarta text-base text-[#353535] placeholder:text-[#8b8b8b] focus:border-[#f84910] focus:outline-none"
                  />
                </div>

                <div className="flex w-full max-w-[380px] items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 font-plus-jakarta text-sm font-medium text-[#8b8b8b]">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(event) => setShowPassword(event.target.checked)}
                      className="appearance-none flex-shrink-0 w-5 h-5 rounded-[7px] border-2 border-[#8b8b8b] bg-white transition-all duration-200 cursor-pointer hover:border-[#FF6134] checked:border-[#FF6134] checked:bg-[#FF6134] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox=%220%200%2016%2016%22%20fill=%22none%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M4.5%208.5L7%2011L11.5%204.5%22%20stroke=%22white%22%20stroke-width=%222.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat"
                    />
                    Mostrar Senha
                  </label>

                  <button type="button" onClick={() => setIsForgotModalOpen(true)} className="font-plus-jakarta text-sm font-medium text-[#f84910] transition hover:text-[#d94718]">
                    Esqueceu a senha?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`h-13 w-full max-w-[380px] rounded-full font-plus-jakarta text-base font-semibold transition-all duration-300 ${isFormValid ? 'bg-gradient-to-r from-[#F84910] via-[#FF6838] to-[#F84910] text-white animate-bg-gradient shadow-[0_0_15px_rgba(248,73,16,0.3)]' : 'bg-[rgba(139,139,139,0.2)] text-[#8b8b8b] cursor-not-allowed'}`}
                >
                  Entrar
                </button>
              </>
            ) : (
              <>
                <div className="flex w-full max-w-[380px] flex-col gap-2">
                  <label className="font-plus-jakarta text-sm font-semibold text-[#606060]">
                    E-mail
                  </label>
                  <div className="flex h-13 w-full items-center rounded-lg border border-[#f8f8f8] bg-[#E4E4E4] px-4">
                    <span className="font-plus-jakarta text-base font-medium text-[#8B8B8B]">{username || 'admin@studiosolart.com'}</span>
                  </div>
                </div>

                <div className="flex w-full max-w-[380px] flex-col gap-2">
                  <label htmlFor="new_password" className="font-plus-jakarta text-sm font-semibold text-[#606060]">
                    Nova Senha
                  </label>
                  <input
                    id="new_password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="h-13 w-full rounded-lg border border-[#f8f8f8] bg-white px-4 font-plus-jakarta text-base text-[#353535] placeholder:text-[#8b8b8b] focus:border-[#f84910] focus:outline-none"
                  />
                </div>

                <div className="flex w-full max-w-[380px] flex-col gap-2">
                  <label htmlFor="confirm_password" className="font-plus-jakarta text-sm font-semibold text-[#606060]">
                    Confirmar Senha
                  </label>
                  <input
                    id="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua senha"
                    className="h-13 w-full rounded-lg border border-[#f8f8f8] bg-white px-4 font-plus-jakarta text-base text-[#353535] placeholder:text-[#8b8b8b] focus:border-[#f84910] focus:outline-none"
                  />
                </div>

                <div className="flex w-full max-w-[380px] items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 font-plus-jakarta text-sm font-medium text-[#8b8b8b]">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(event) => setShowPassword(event.target.checked)}
                      className="appearance-none flex-shrink-0 w-5 h-5 rounded-[7px] border-2 border-[#8b8b8b] bg-white transition-all duration-200 cursor-pointer hover:border-[#FF6134] checked:border-[#FF6134] checked:bg-[#FF6134] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox=%220%200%2016%2016%22%20fill=%22none%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M4.5%208.5L7%2011L11.5%204.5%22%20stroke=%22white%22%20stroke-width=%222.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-center bg-no-repeat"
                    />
                    Mostrar Senha
                  </label>

                  <button type="button" onClick={() => setLoginPhase('login')} className="font-plus-jakarta text-sm font-medium text-[#f84910] transition hover:text-[#d94718]">
                    Voltar ao Login
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={newPassword === '' || confirmPassword === ''}
                  className={`h-13 w-full max-w-[380px] rounded-full font-plus-jakarta text-base font-semibold transition-all duration-300 ${(newPassword !== '' && confirmPassword !== '') ? 'bg-gradient-to-r from-[#F84910] via-[#FF6838] to-[#F84910] text-white animate-bg-gradient shadow-[0_0_15px_rgba(248,73,16,0.3)]' : 'bg-[rgba(139,139,139,0.2)] text-[#8b8b8b] cursor-not-allowed'}`}
                >
                  Entrar
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* MODAL ESQUECEU A SENHA */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(39,13,4,0.15)] backdrop-blur-[2px]">
          <div className="relative flex w-full max-w-[500px] flex-col items-center gap-8 rounded-lg border border-[#F0F0F3] bg-white p-8 shadow-2xl">
            {/* Close Button */}
            <button 
              onClick={() => { setIsForgotModalOpen(false); setOtpSent(false); }}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-[#606060] transition hover:bg-gray-100"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Email Icon / Banner */}
            <div className={`flex size-[54px] items-center justify-center rounded-full ${otpSent ? 'bg-[rgba(54,186,111,0.1)] text-[#36BA6F]' : 'bg-[rgba(248,73,16,0.1)] text-[#F84910]'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {otpSent ? <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path> : <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>}
                {otpSent ? <polyline points="22 4 12 14.01 9 11.01"></polyline> : <polyline points="22,6 12,13 2,6"></polyline>}
              </svg>
            </div>

            {!otpSent ? (
              <>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="font-plus-jakarta text-xl font-bold text-[#0D0D0D]">Recuperação de Senha</h3>
                  <p className="max-w-[436px] font-plus-jakarta text-sm leading-snug text-[#606060]">
                    Identificamos sua conta pelo e-mail <strong>{username || 'informado'}</strong>. Deseja receber um código de validação?
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isProcessing || !username}
                  className={`h-12 w-full max-w-[436px] rounded-full font-plus-jakarta text-base font-semibold transition-all duration-300 ${
                    !isProcessing && username 
                    ? 'bg-[#0D0D0D] text-white cursor-pointer hover:opacity-90 shadow-lg' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? 'Enviando...' : 'Enviar Código para E-mail'}
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h3 className="font-plus-jakarta text-xl font-bold text-[#0D0D0D]">Verifique seu E-mail</h3>
                  <p className="max-w-[436px] font-plus-jakarta text-sm leading-snug text-[#0D0D0D]">
                    Por favor, insira o código de 6 dígitos que enviamos para o seu e-mail.
                  </p>
                </div>

                <div className="flex w-full max-w-[436px] items-center justify-between gap-2">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newOtp = [...otpCode];
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        newOtp[idx] = val;
                        setOtpCode(newOtp);
                        if (val && idx < 5) {
                          document.getElementById(`otp-input-${idx + 1}`).focus();
                        }
                      }}
                      id={`otp-input-${idx}`}
                      className="h-[64px] w-[66px] rounded-lg border border-[#F0F0F3] bg-white text-center font-plus-jakarta text-3xl font-bold text-[#f84910] shadow-sm outline-none transition focus:border-[#F84910] focus:ring-1 focus:ring-[#F84910]"
                    />
                  ))}
                </div>

                <p className="font-plus-jakarta text-sm text-[#0D0D0D]">
                  Não recebeu o código? <span onClick={handleSendOTP} className="cursor-pointer font-semibold text-[#F84910] hover:underline">{isProcessing ? 'Reenviando...' : 'Reenviar código'}</span>
                </p>

                <button 
                  type="button"
                  disabled={!otpCode.every(d => d !== '')}
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setLoginPhase('reset_password');
                  }}
                  className={`h-12 w-full max-w-[436px] rounded-full font-plus-jakarta text-base font-semibold transition-all duration-300 ${
                    otpCode.every(d => d !== '') 
                    ? 'bg-[linear-gradient(90deg,#F84910_0%,#FF6838_100%)] text-white cursor-pointer hover:opacity-90 shadow-[0_0_15px_rgba(248,73,16,0.3)]' 
                    : 'bg-[rgba(139,139,139,0.2)] text-[#8B8B8B] cursor-not-allowed border-none'
                  }`}
                >
                  Confirmar Código
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
