import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { Shield, CheckCircle2, XCircle, AlertTriangle, UserCheck, MessageSquare, Car, Users, Ban, ShieldCheck, Trash2, MapPin, Clock, UserX, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import api, { apiError } from '../lib/api';

const TabBtn = ({ active, onClick, icon: Icon, count, children }) => (
  <button onClick={onClick} className={`chip flex-1 justify-center py-2 text-sm ${active ? 'active' : ''}`}>
    <Icon size={16} /> {children}
    {typeof count === 'number' && (
      <span
        className={`ml-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
          active ? 'bg-[var(--bj-yellow)] text-[var(--bj-navy)]' : 'bg-[var(--bj-navy)] text-white'
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

const ModerationPage = () => {
  const { user, updateUserStatus } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('aprovacoes');
  const [reports, setReports] = useState([]);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const { toast } = useToast();

  const load = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const [u, r, p, t] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/reports'),
        api.get('/admin/pending'),
        api.get('/admin/trips'),
      ]);
      setUsers(u.data);
      setReports(r.data);
      setPending(p.data);
      setTrips(t.data);
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

  const removeUser = async (u) => {
    if (!window.confirm(`REMOVER permanentemente o usuário "${u.name}" (${u.email})?\n\nTodas as viagens publicadas por ele serão canceladas e passageiros serão avisados. Esta ação não pode ser desfeita.`)) return;
    try {
      const { data } = await api.delete(`/admin/users/${u.id}`);
      toast({
        title: 'Usuário removido',
        description: data.trips_removed ? `${data.trips_removed} viagem(ns) também removida(s).` : 'Conta apagada com sucesso.',
      });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: apiError(e), variant: 'destructive' });
    }
  };

  const messageUser = async (u) => {
    const text = window.prompt(`Enviar mensagem para ${u.name} (${u.role}):`, 'Olá! Sou da moderação Motoristas VIP Litoral.');
    if (text === null) return;
    const clean = text.trim();
    if (!clean) {
      toast({ title: 'Digite uma mensagem', variant: 'destructive' });
      return;
    }
    try {
      const { data } = await api.post('/chats/message', { other_user_id: u.id, text: clean });
      toast({ title: 'Mensagem enviada', description: `Aberto o chat com ${u.name}.` });
      if (data && data.chat_id) navigate(`/chat/${data.chat_id}`);
      else navigate('/chat');
    } catch (e) {
      toast({ title: 'Erro ao enviar', description: apiError(e), variant: 'destructive' });
    }
  };

  const removeTrip = async (trip) => {
    if (!window.confirm(`REMOVER permanentemente a viagem ${trip.origin} → ${trip.destination}? Esta ação não pode ser desfeita.`)) return;
    try {
      const { data } = await api.delete(`/admin/trips/${trip.id}`);
      toast({
        title: 'Viagem removida',
        description: data.notified > 0 ? `${data.notified} passageiro(s) foram avisados.` : 'Nenhum passageiro afetado.',
      });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: apiError(e), variant: 'destructive' });
    }
  };

  const cancelTripByAdmin = async (trip) => {
    const reason = window.prompt(`Cancelar a viagem ${trip.origin} → ${trip.destination}?\n\nInforme o motivo (opcional):`, '');
    if (reason === null) return; // user hit Cancel
    try {
      const { data } = await api.post(`/admin/trips/${trip.id}/cancel`, { reason: reason || null });
      toast({
        title: 'Viagem cancelada',
        description: data.notified > 0 ? `${data.notified} passageiro(s) foram avisados.` : 'Motorista foi notificado.',
      });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: apiError(e), variant: 'destructive' });
    }
  };

  const totalPending = pending.length;
  const openReports = reports.filter((r) => r.status === 'pendente').length;
  const blockedUsers = users.filter((u) => u.status === 'bloqueado').length;
  const totalMotoristas = users.filter((u) => u.role === 'motorista').length;
  const totalPassageiros = users.filter((u) => u.role === 'passageiro').length;
  const totalTrips = trips.length;
  const totalReports = reports.length;

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
          <TabBtn active={tab === 'aprovacoes'} onClick={() => setTab('aprovacoes')} icon={UserCheck} count={totalPending}>Aprovações</TabBtn>
          <TabBtn active={tab === 'viagens'} onClick={() => setTab('viagens')} icon={Car} count={totalTrips}>Viagens</TabBtn>
          <TabBtn active={tab === 'motoristas'} onClick={() => setTab('motoristas')} icon={Car} count={totalMotoristas}>Motoristas</TabBtn>
          <TabBtn active={tab === 'passageiros'} onClick={() => setTab('passageiros')} icon={Users} count={totalPassageiros}>Passageiros</TabBtn>
          <TabBtn active={tab === 'denuncias'} onClick={() => setTab('denuncias')} icon={AlertTriangle} count={totalReports}>Denúncias</TabBtn>
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

          {tab === 'viagens' && (
            <div className="space-y-2">
              {trips.length === 0 && (
                <div className="bg-white p-6 rounded-2xl text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                  Nenhuma viagem publicada.
                </div>
              )}
              {trips.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl p-3 border border-[#ece3c7]">
                  <div className="flex items-center gap-3">
                    <img src={t.driver_avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[var(--bj-text)] truncate">{t.driver_name}</div>
                      <div className="flex items-center gap-1 text-xs text-[var(--bj-text)] opacity-70 truncate">
                        <MapPin size={12} /> {t.origin} → {t.destination}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-extrabold text-[var(--bj-navy)]">R$ {t.price}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        t.status === 'ativa' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}>{t.status}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--bj-text)] opacity-80">
                    <span className="flex items-center gap-1"><Clock size={12} /> {t.date} · {t.time}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {t.seats_filled}/{t.seats_total} vagas</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => cancelTripByAdmin(t)}
                      disabled={t.status === 'cancelada'}
                      className="chip justify-center py-2 text-sm disabled:opacity-50"
                    >
                      <XCircle size={14} /> Cancelar
                    </button>
                    <button
                      onClick={() => removeTrip(t)}
                      className="btn-outline-danger justify-center py-2 text-sm"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(tab === 'motoristas' || tab === 'passageiros') && (
            <div className="space-y-2">
              {(() => {
                const roleFilter = tab === 'motoristas' ? 'motorista' : 'passageiro';
                const list = users.filter((u) => u.role === roleFilter);
                if (list.length === 0) {
                  return (
                    <div className="bg-white p-6 rounded-2xl text-center text-[var(--bj-text)] opacity-70 border border-[#ece3c7]">
                      Nenhum {roleFilter} cadastrado.
                    </div>
                  );
                }
                return list.map((u) => (
                  <div key={u.id} className="bg-white rounded-2xl p-3 border border-[#ece3c7]">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--bj-text)] truncate">{u.name}</div>
                        <div className="text-xs text-[var(--bj-text)] opacity-70 truncate">{u.email}</div>
                        {u.phone && (
                          <div className="text-xs text-[var(--bj-text)] opacity-60 truncate">{u.phone}{u.city ? ` · ${u.city}` : ''}</div>
                        )}
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        u.status === 'ativo' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}>
                        {u.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => messageUser(u)}
                        className="chip active justify-center py-2 text-sm"
                      >
                        <MessageCircle size={14} /> Mensagem
                      </button>
                      <button
                        onClick={() => toggleUser(u)}
                        className="chip justify-center py-2 text-sm"
                      >
                        {u.status === 'ativo' ? <><Ban size={14} /> Bloquear</> : <><ShieldCheck size={14} /> Reativar</>}
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        className="btn-outline-danger justify-center py-2 text-sm"
                      >
                        <UserX size={14} /> Remover
                      </button>
                    </div>
                  </div>
                ));
              })()}
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
