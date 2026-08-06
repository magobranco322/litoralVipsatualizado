import React, { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import IOSInstructions from '../components/IOSInstructions';
import { useAuth } from '../context/AuthContext';
import { Star, Car, UserRound, Shield, BadgeCheck, Phone, Mail, MapPin, Bell, HelpCircle, ChevronRight, Camera, PencilLine, Check, X, User as UserIcon, Download, Smartphone } from 'lucide-react';
import { readImageAsDataUrl } from '../lib/image';
import { useToast } from '../hooks/use-toast';
import { usePWAInstall } from '../hooks/usePWAInstall';

const DisplayRow = ({ icon: Icon, label, value, onEdit }) => (
  <button
    onClick={onEdit}
    className="w-full flex items-center gap-3 bg-white p-4 rounded-2xl border border-[#ece3c7] hover:border-[var(--bj-navy)] transition-colors text-left"
  >
    <div className="w-9 h-9 rounded-lg bg-[var(--bj-cream-2)] flex items-center justify-center">
      <Icon size={18} className="text-[var(--bj-navy)]" />
    </div>
    <div className="flex-1">
      <div className="text-xs text-[var(--bj-text)] opacity-70">{label}</div>
      <div className="font-semibold text-[var(--bj-text)]">{value || <span className="opacity-60 font-normal">Não informado</span>}</div>
    </div>
    {onEdit ? (
      <PencilLine size={16} className="text-[var(--bj-text)] opacity-50" />
    ) : (
      <ChevronRight size={18} className="text-[var(--bj-text)] opacity-40" />
    )}
  </button>
);

const ProfilePage = () => {
  const { user, updateUserFields } = useAuth();
  const fileRef = useRef(null);
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const { canInstall, installed, isIOS, promptInstall } = usePWAInstall();

  const handleInstall = async () => {
    if (canInstall) {
      const res = await promptInstall();
      if (res.ok) toast({ title: 'App instalado!', description: 'Abra pelo atalho na sua tela inicial.' });
      return;
    }
    // iOS ou navegador sem prompt automático: mostrar instruções
    setIosOpen(true);
  };

  useEffect(() => {
    if (user) setForm({ name: user.name || '', phone: user.phone || '', city: user.city || '' });
  }, [user]);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !user) return;
    try {
      const dataUrl = await readImageAsDataUrl(file, 400);
      await updateUserFields(user.id, { avatar: dataUrl });
      toast({ title: 'Foto atualizada!' });
    } catch (err) {
      toast({ title: 'Erro na imagem', description: err.message, variant: 'destructive' });
    }
  };

  const startEdit = () => setEditing(true);
  const cancelEdit = () => {
    setEditing(false);
    if (user) setForm({ name: user.name || '', phone: user.phone || '', city: user.city || '' });
  };
  const saveEdit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'O nome não pode ficar vazio', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updateUserFields(user.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
      });
      toast({ title: 'Perfil atualizado' });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const roleLabel = user.role === 'motorista' ? 'Motorista' : user.role === 'admin' ? 'Administrador' : 'Passageiro';
  const RoleIcon = user.role === 'motorista' ? Car : user.role === 'admin' ? Shield : UserRound;

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <div className="px-5 pt-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={user.avatar} className="w-20 h-20 rounded-full object-cover border-4 border-[var(--bj-yellow)]" alt="" />
            <button
              type="button"
              onClick={() => fileRef.current && fileRef.current.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--bj-navy)] border-4 border-[var(--bj-cream)] flex items-center justify-center hover:scale-110 transition-transform"
              title="Trocar foto"
              aria-label="Trocar foto"
            >
              <Camera size={13} className="text-[var(--bj-yellow)]" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-[var(--bj-text)] leading-tight truncate">{user.name}</div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-[var(--bj-text)] opacity-80">
              <Star size={14} className="fill-[var(--bj-navy)] text-[var(--bj-navy)]" />
              <span className="font-semibold">{Number(user.rating || 0).toFixed(1)}</span>
              <span>· {user.trips} viagens</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bj-navy)] text-white text-xs font-bold">
              <RoleIcon size={12} /> {roleLabel}
              {user.verified && <BadgeCheck size={12} className="ml-1" />}
            </div>
          </div>
        </div>

        {!installed && (
          <div className="mt-5 p-4 rounded-2xl bg-[var(--bj-navy)] text-white flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--bj-yellow)] flex items-center justify-center flex-shrink-0">
              <Smartphone size={22} className="text-[var(--bj-navy)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold leading-tight">Instalar na tela inicial</div>
              <div className="text-xs opacity-80 mt-0.5">Acesse mais rápido, como um app.</div>
            </div>
            <button
              onClick={handleInstall}
              className="btn-yellow text-sm py-2 px-3 flex-shrink-0"
              style={{ background: 'var(--bj-yellow)', color: 'var(--bj-navy)' }}
            >
              <Download size={14} className="inline mr-1" /> Instalar
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <h2 className="font-extrabold text-[var(--bj-text)]">Dados pessoais</h2>
          {!editing ? (
            <button onClick={startEdit} className="chip py-1.5 px-3 text-xs">
              <PencilLine size={14} /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="chip py-1.5 px-3 text-xs"><X size={14} /> Cancelar</button>
              <button onClick={saveEdit} disabled={saving} className="chip active py-1.5 px-3 text-xs disabled:opacity-70">
                <Check size={14} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="mt-3 space-y-2.5">
            <DisplayRow icon={UserIcon} label="Nome" value={user.name} onEdit={startEdit} />
            <DisplayRow icon={Mail} label="E-mail" value={user.email} />
            <DisplayRow icon={Phone} label="Telefone" value={user.phone} onEdit={startEdit} />
            <DisplayRow icon={MapPin} label="Cidade" value={user.city} onEdit={startEdit} />
            <DisplayRow icon={Bell} label="Notificações" value="Ativadas" />
            <DisplayRow icon={HelpCircle} label="Ajuda & Suporte" value="Central de atendimento" />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Nome</label>
              <div className="input-icon-wrap mt-1">
                <UserIcon size={18} className="input-icon" />
                <input className="round-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Telefone</label>
              <div className="input-icon-wrap mt-1">
                <Phone size={18} className="input-icon" />
                <input className="round-input" placeholder="(41) 99999-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--bj-text)] opacity-70 pl-2">Cidade</label>
              <div className="input-icon-wrap mt-1">
                <MapPin size={18} className="input-icon" />
                <input className="round-input" placeholder="Ex: Curitiba, PR" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <button onClick={saveEdit} disabled={saving} className="btn-primary w-full mt-2 disabled:opacity-70">
              <Check size={16} className="inline mr-1" /> {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}

        <div className="mt-6 p-4 rounded-2xl bg-white border border-[#ece3c7]">
          <div className="font-bold text-[var(--bj-text)] mb-2">Sobre você</div>
          <p className="text-sm text-[var(--bj-text)] opacity-80 leading-relaxed">
            Bem-vindo(a) à Motoristas VIP Litoral! Complete seu perfil para aumentar a confiança de outros usuários e receber mais oportunidades de viagem.
          </p>
        </div>
      </div>
      <IOSInstructions open={iosOpen} onClose={() => setIosOpen(false)} />
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
