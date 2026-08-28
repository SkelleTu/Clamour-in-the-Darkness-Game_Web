import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, UserPlus } from 'lucide-react';
import { login, register, type AuthSession } from '@/lib/universalServer';

type Props = { onAuthenticated: (session: AuthSession) => void };

type Mode = 'login' | 'register';

export function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    setError('');
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
      setError('Usuário: 3 a 24 caracteres, usando letras, números ou _.');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setBusy(true);
    try {
      const session = mode === 'register'
        ? await register(normalized, password)
        : await login(normalized, password);
      if (mode === 'register') {
        setSuccess('Conta criada com sucesso.');
      }
      setTimeout(() => onAuthenticated(session), mode === 'register' ? 900 : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível acessar sua conta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#050507] text-white pointer-events-auto">
      <div className="absolute inset-0 opacity-[0.18] bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(75,85,99,0.1),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(30,41,59,0.2),transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.045] pointer-events-none [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <p className="mb-3 text-[10px] font-mono tracking-[0.55em] uppercase text-white/25">Universal World // Araras</p>
          <h1 className="text-5xl font-semibold tracking-[0.22em] uppercase text-white/90">Clamour</h1>
          <p className="mt-2 text-[11px] font-mono tracking-[0.4em] uppercase text-white/35">in the darkness</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/50 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex rounded-xl border border-white/8 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition ${mode === 'login' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/65'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition ${mode === 'register' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/65'}`}
            >
              Criar conta
            </button>
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              {mode === 'login' ? <LogIn className="h-4 w-4 text-white/50" /> : <UserPlus className="h-4 w-4 text-white/50" />}
            </div>
            <div>
              <p className="text-sm text-white/75">{mode === 'login' ? 'Acesse seu mundo' : 'Crie seu personagem persistente'}</p>
              <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-white/25">Sua conta será armazenada no Universal Server</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-white/35">Usuário</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
                autoComplete="username"
                maxLength={24}
                placeholder="seu_usuario"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/15 focus:border-white/25 focus:bg-white/[0.06]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-white/35">Senha</span>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-11 py-3 pr-12 text-sm text-white outline-none transition focus:border-white/25 focus:bg-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-white/60"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-white/35">Confirmar senha</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-white/25 focus:bg-white/[0.06]"
                />
              </label>
            )}

             {error && (
               <div className="rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs font-mono leading-relaxed text-red-300/80">
                 {error}
               </div>
             )}

             {success && (
               <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-mono leading-relaxed text-emerald-300/80">
                 {success}
               </div>
             )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-3.5 text-xs font-mono uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/15 hover:text-white disabled:cursor-wait disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {busy ? 'Conectando...' : mode === 'login' ? 'Entrar no mundo' : 'Criar conta'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-mono leading-relaxed text-white/18">
          O mundo do jogo e o progresso da conta são persistidos pelo Universal Server.
        </p>
      </div>
    </div>
  );
}
