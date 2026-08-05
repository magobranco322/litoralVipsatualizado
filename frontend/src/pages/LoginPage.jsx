import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, Car, UserRound, Camera } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { readImageAsDataUrl } from '../lib/image';

const LoginPage = () => {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('passageiro');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataUrl(file, 400);
      setAvatar(dataUrl);
    } catch (err) {
      toast({ title: 'Erro na imagem', description: err.message, variant: 'destructive' });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      let res;
      if (mode === 'login') {
        res = login(email.trim(), password);
      } else {
        if (!name.trim()) {
          setLoading(false);
          toast({ title: 'Informe seu nome', variant: 'destructive' });
          return;
        }
        res = register({ name: name.trim(), email: email.trim(), password, role, avatar });
      }
      setLoading(false);
      if (!res.ok) {
        toast({ title: 'Ops!', description: res.message, variant: 'destructive' });
        return;
      }
      toast({ title: mode === 'login' ? 'Bem-vindo de volta!' : 'Conta criada com sucesso!' });
      navigate('/buscar', { replace: true });
    }, 400);
  };

  return (
    <div className="mobile-shell">
      <div className="striped-bar" />
      <div className="px-6 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bj-navy)] flex items-center justify-center">
            <Car size={22} className="text-[var(--bj-yellow)]" />
          </div>
          <div>
            <div className="text-[20px] font-extrabold text-[var(--bj-text)] leading-tight tracking-tight">MOTORISTAS VIP LITORAL</div>
            <div className="text-sm text-[var(--bj-text)] opacity-70">Caronas & transfer pelo litoral</div>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-[var(--bj-text)] mt-6">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <p className="text-[var(--bj-text)] opacity-70 mt-1">
          {mode === 'login' ? 'Acesse sua conta para continuar.' : 'Junte-se à comunidade em minutos.'}
        </p>

        {mode === 'register' && (
          <div className="flex justify-center mt-6">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--bj-cream-2)] border-4 border-[var(--bj-yellow)] flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="Sua foto" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={34} className="text-[var(--bj-navy)] opacity-40" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[var(--bj-navy)] border-4 border-[var(--bj-cream)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera size={15} className="text-[var(--bj-yellow)]" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}

        {mode === 'register' && (
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => setRole('passageiro')}
              className={`chip flex-1 justify-center ${role === 'passageiro' ? 'active' : ''}`}
            >
              <UserRound size={16} /> Passageiro
            </button>
            <button
              type="button"
              onClick={() => setRole('motorista')}
              className={`chip flex-1 justify-center ${role === 'motorista' ? 'active' : ''}`}
            >
              <Car size={16} /> Motorista
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === 'register' && (
            <div className="input-icon-wrap">
              <UserIcon size={18} className="input-icon" />
              <input
                className="round-input"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-icon-wrap">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              className="round-input"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-icon-wrap">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              className="round-input"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button disabled={loading} type="submit" className="btn-primary w-full mt-2">
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="text-center mt-5 text-sm text-[var(--bj-text)]">
          {mode === 'login' ? (
            <>
              Ainda não tem conta?{' '}
              <button className="font-bold text-[var(--bj-navy)]" onClick={() => setMode('register')}>
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button className="font-bold text-[var(--bj-navy)]" onClick={() => setMode('login')}>
                Entrar
              </button>
            </>
          )}
        </div>

        <div className="mt-8 p-4 bg-white rounded-2xl border border-[#ece3c7]">
          <div className="text-xs font-bold text-[var(--bj-text)] mb-2">Contas de demonstração</div>
          <div className="text-xs text-[var(--bj-text)] opacity-80 space-y-1">
            <div><b>Passageiro:</b> magobranco322@gmail.com / 123456</div>
            <div><b>Motorista:</b> giovanna@example.com / 123456</div>
            <div><b>Admin:</b> admin@borajunto.com / admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
