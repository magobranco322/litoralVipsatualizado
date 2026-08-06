import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { Shield, CheckCircle2, XCircle, AlertTriangle, UserCheck, MessageSquare, Car, Users, Ban, ShieldCheck } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api, { apiError } from '../lib/api';

const TabBtn = ({ active, onClick, icon: Icon, children }) => (
  <button onClick={onClick} className={`chip flex-1 justify-center ${active ? 'active' : ''}`}>
    <Icon size={16} /> {children}
  </button>
);

const ModerationPage = () => {
  const { user, updateUserStatus } = useAuth();
  const [tab, setTab] = useState('aprovacoes');
  const [reports, setReports] = useState([]);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const { toast } = useToast();

  const load = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const [u, r, p] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/reports'),
        api.get('/admin/pending'),
      ]);
      setUsers(u.data);
      setReports(r.data);
      setPending(p.data);
    } catch (e) {
      toast({ title: 'Erro ao carregar', description: apiError(e), variant: 'destructive' });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const approve = async (uid) => {
    try {
      await api.post(`/admin/pending/${uid}/approve`);
      toast({ title: 'Cadastro aprovado' });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: apiError(e), variant: 'destructive' });
    }
  };
  const rejectPending = async (uid) => {
    try {
      await api.post(`/admin/pending/${uid}/reject`);
      toast({ title: 'Cadastro rejeitado', variant: 'destructive' });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: apiError(e), variant: 'destructive' });
    }
  };
  const resolveReport = async (id) => {
    try {
      await api.post(`/admin/reports/${id}/resolve`);
      toast({ title: 'Denúncia resolvida' });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: apiError(e), variant: 'destructive' });
    }
  };
  const dismissReport = async (id) => {
    try {
      await api.delete(`/admin/reports/${id}`);
      toast({ title: 'Denúncia descartada' });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: apiError(e), variant: 'destructive' });
    }
  };
  const toggleUser = async (u) => {
    const next = u.status === 'ativo' ? 'bloqueado' : 'ativo';
    await updateUserStatus(u.id, next);
    toast({ title: next === 'bloqueado' ? 'Usuário bloqueado' : 'Usuário reativado' });
    load();
  };

  const totalPending = pending.length;
  const openReports = reports.filter((r) => r.status === 'pendente').length;
  const blockedUsers = users.filter((u) => u.status === 'bloqueado').length;

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={22} className="text-[var(--bj-navy)]" />
          <h1 className="text-3xl font-extrabold text-[var(--bj-text)] leading-tight">Moderação</h1>
        </div>
        <p className="text-[var(--bj-text)] opacity-70">Painel administrativo Motoristas VIP Litoral.</p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-white p-3 rounded-2xl border border-[#ece3c7] text-center">
            <div className="text-2xl font-extrabold text-[var(--bj-navy)]">{totalPending}</div>
            <div className="text-[11px] text-[var(--bj-text)] opacity-70 mt-0.5">Aprovações</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#ece3c7] text-center">
            <div className="text-2xl font-extrabold text-[var(--bj-red)]">{openReports}</div>
            <div className="text-[11px] text-[var(--bj-text)] opacity-70 mt-0.5">Denúncias</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#ece3c7] text-center">
            <div className="text-2xl font-extrabold text-[var(--bj-text)]">{blockedUsers}</div>
            <div className="text-[11px] text-[var(--bj-text)] opacity-70 mt-0.5">Bloqueados</div>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
          <TabBtn active={tab === 'aprovacoes'} onClick={() => setTab('aprovacoes')} icon={UserCheck}>Aprovações</TabBtn>
          <TabBtn active={tab === 'usuarios'} onClick={() => setTab('usuarios')} icon={Users}>Usuários</TabBtn>
          <TabBtn active={tab === 'denuncias'} onClick={() => setTab('denuncias')} icon={AlertTriangle}>Denúncias</TabBtn>
        </div>

        <div className="mt-5 pb-6">
          {tab === 'aprovacoes' && (
            <div className="space-y-3">
              {pending.length === 0 && (
                <div className="bg-white p-6 rounded-2xl text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                  Nada para aprovar por enquanto.
                </div>
              )}
              {pending.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-4 border border-[#ece3c7]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[var(--bj-text)]">{p.name}</div>
                      <div className="text-sm text-[var(--bj-text)] opacity-70">{p.email}</div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--bj-cream-2)] text-[var(--bj-navy)] flex items-center gap-1">
                      {p.role === 'motorista' ? <Car size={12} /> : <Users size={12} />} {p.role}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => approve(p.id)} className="flex-1 btn-primary text-sm py-2.5">
                      <CheckCircle2 size={16} className="inline mr-1" /> Aprovar
                    </button>
                    <button onClick={() => rejectPending(p.id)} className="flex-1 btn-outline-danger justify-center text-sm py-2.5">
                      <XCircle size={16} /> Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'usuarios' && (
            <div className="space-y-2">
              {users.filter((u) => u.role !== 'admin').map((u) => (
                <div key={u.id} className="bg-white rounded-2xl p-3 border border-[#ece3c7] flex items-center gap-3">
                  <img src={u.avatar} className="w-11 h-11 rounded-full object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--bj-text)] truncate">{u.name}</div>
                    <div className="text-xs text-[var(--bj-text)] opacity-70 truncate">{u.email} · {u.role}</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    u.status === 'ativo' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                  }`}>
                    {u.status}
                  </span>
                  <button
                    onClick={() => toggleUser(u)}
                    className={`p-2 rounded-full ${u.status === 'ativo' ? 'text-[var(--bj-red)] hover:bg-red-50' : 'text-[#166534] hover:bg-green-50'}`}
                    title={u.status === 'ativo' ? 'Bloquear' : 'Reativar'}
                  >
                    {u.status === 'ativo' ? <Ban size={18} /> : <ShieldCheck size={18} />}
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <div className="bg-white p-6 rounded-2xl text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                  Nenhum usuário cadastrado ainda.
                </div>
              )}
            </div>
          )}

          {tab === 'denuncias' && (
            <div className="space-y-3">
              {reports.length === 0 && (
                <div className="bg-white p-6 rounded-2xl text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                  Sem denúncias.
                </div>
              )}
              {reports.map((r) => {
                const TypeIcon = r.type === 'usuario' ? Users : r.type === 'viagem' ? Car : MessageSquare;
                return (
                  <div key={r.id} className="bg-white rounded-2xl p-4 border border-[#ece3c7]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon size={16} className="text-[var(--bj-navy)]" />
                        <span className="font-bold text-[var(--bj-text)]">{r.target_name}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'pendente' ? 'bg-[#FEF3C7] text-[#8A6D0A]' : 'bg-[#DCFCE7] text-[#166534]'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--bj-text)] opacity-90">{r.reason}</div>
                    <div className="mt-1 text-xs text-[var(--bj-text)] opacity-60">Reportado por {r.reporter_name} · {new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                    {r.status === 'pendente' && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => resolveReport(r.id)} className="flex-1 btn-primary text-sm py-2.5">
                          <CheckCircle2 size={16} className="inline mr-1" /> Resolver
                        </button>
                        <button onClick={() => dismissReport(r.id)} className="flex-1 btn-outline-danger justify-center text-sm py-2.5">
                          <XCircle size={16} /> Descartar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default ModerationPage;
