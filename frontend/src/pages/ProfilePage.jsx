import React, { useRef } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { Star, Car, UserRound, Shield, BadgeCheck, Phone, Mail, MapPin, Bell, HelpCircle, ChevronRight, Camera } from 'lucide-react';
import { readImageAsDataUrl } from '../lib/image';
import { useToast } from '../hooks/use-toast';

const Row = ({ icon: Icon, label, value, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 bg-white p-4 rounded-2xl border border-[#ece3c7] hover:border-[var(--bj-navy)] transition-colors text-left"
  >
    <div className="w-9 h-9 rounded-lg bg-[var(--bj-cream-2)] flex items-center justify-center">
      <Icon size={18} className="text-[var(--bj-navy)]" />
    </div>
    <div className="flex-1">
      <div className="text-xs text-[var(--bj-text)] opacity-70">{label}</div>
      <div className="font-semibold text-[var(--bj-text)]">{value}</div>
    </div>
    <ChevronRight size={18} className="text-[var(--bj-text)] opacity-40" />
  </button>
);

const ProfilePage = () => {
  const { user, updateUserFields } = useAuth();
  const fileRef = useRef(null);
  const { toast } = useToast();

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !user) return;
    try {
      const dataUrl = await readImageAsDataUrl(file, 400);
      updateUserFields(user.id, { avatar: dataUrl });
      toast({ title: 'Foto atualizada!' });
    } catch (err) {
      toast({ title: 'Erro na imagem', description: err.message, variant: 'destructive' });
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
              <span className="font-semibold">{user.rating.toFixed(1)}</span>
              <span>· {user.trips} viagens</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bj-navy)] text-white text-xs font-bold">
              <RoleIcon size={12} /> {roleLabel}
              {user.verified && <BadgeCheck size={12} className="ml-1" />}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          <Row icon={Mail} label="E-mail" value={user.email} />
          <Row icon={Phone} label="Telefone" value="(41) 99999-0000" />
          <Row icon={MapPin} label="Cidade" value="Curitiba, PR" />
          <Row icon={Bell} label="Notificações" value="Ativadas" />
          <Row icon={HelpCircle} label="Ajuda & Suporte" value="Central de atendimento" />
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-white border border-[#ece3c7]">
          <div className="font-bold text-[var(--bj-text)] mb-2">Sobre você</div>
          <p className="text-sm text-[var(--bj-text)] opacity-80 leading-relaxed">
            Bem-vindo(a) à Motoristas VIP Litoral! Complete seu perfil para aumentar a confiança de outros usuários e receber mais oportunidades de viagem.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
