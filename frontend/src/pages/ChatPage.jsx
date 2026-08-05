import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { MOCK_CHATS } from '../mock';
import { useAuth } from '../context/AuthContext';
import { Send, ArrowLeft, Search as SearchIcon } from 'lucide-react';

const STORAGE = 'bj_chats';

const loadChats = () => {
  const stored = localStorage.getItem(STORAGE);
  if (stored) { try { return JSON.parse(stored); } catch (e) { /* ignore */ } }
  return MOCK_CHATS;
};

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState(loadChats());
  const [activeId, setActiveId] = useState(null);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(chats));
  }, [chats]);

  const active = useMemo(() => chats.find((c) => c.id === activeId), [chats, activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active]);

  const filteredChats = chats.filter((c) =>
    c.otherUserName.toLowerCase().includes(query.toLowerCase())
  );

  const send = () => {
    if (!text.trim() || !active) return;
    const newMsg = {
      id: 'm_' + Date.now(),
      senderId: user.id,
      text: text.trim(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: newMsg.text, lastTime: 'agora', unread: 0 }
          : c
      )
    );
    setText('');
  };

  const openChat = (id) => {
    setActiveId(id);
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };

  if (active) {
    return (
      <div className="mobile-shell">
        <div className="striped-bar" />
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[#ece3c7] bg-white">
          <button onClick={() => setActiveId(null)} className="p-1">
            <ArrowLeft size={22} className="text-[var(--bj-text)]" />
          </button>
          <img src={active.otherUserAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
          <div>
            <div className="font-bold text-[var(--bj-text)]">{active.otherUserName}</div>
            <div className="text-xs text-[var(--bj-text)] opacity-70">online</div>
          </div>
        </div>
        <div ref={scrollRef} className="px-4 py-4 space-y-2 overflow-y-auto" style={{ height: 'calc(100vh - 260px)' }}>
          {active.messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl text-[15px] shadow-sm ${
                    mine
                      ? 'bg-[var(--bj-navy)] text-white rounded-br-sm'
                      : 'bg-white text-[var(--bj-text)] rounded-bl-sm border border-[#ece3c7]'
                  }`}
                >
                  <div>{m.text}</div>
                  <div className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-[var(--bj-text)] opacity-60'}`}>
                    {m.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[456px] px-2">
          <div className="flex items-center gap-2 bg-white rounded-full border border-[#ece3c7] p-1.5 shadow-md">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Escreva uma mensagem..."
              className="flex-1 bg-transparent px-3 py-2 outline-none text-[15px] text-[var(--bj-text)]"
            />
            <button onClick={send} className="w-10 h-10 rounded-full bg-[var(--bj-navy)] flex items-center justify-center hover:bg-[var(--bj-navy-dark)] transition-colors">
              <Send size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-shell">
      <Header />
      <div className="striped-bar" />
      <div className="px-5 pt-5">
        <h1 className="text-3xl font-extrabold text-[var(--bj-text)] leading-tight">Chat</h1>
        <p className="text-[var(--bj-text)] opacity-70 mt-1">Converse com motoristas e passageiros.</p>

        <div className="input-icon-wrap mt-5">
          <SearchIcon size={18} className="input-icon" />
          <input
            className="round-input"
            placeholder="Buscar conversa"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-5 space-y-2">
          {filteredChats.map((c) => (
            <button
              key={c.id}
              onClick={() => openChat(c.id)}
              className="w-full flex items-center gap-3 bg-white rounded-2xl p-3 border border-[#ece3c7] hover:border-[var(--bj-navy)] transition-colors text-left"
            >
              <img src={c.otherUserAvatar} className="w-12 h-12 rounded-full object-cover flex-shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[var(--bj-text)] truncate">{c.otherUserName}</span>
                  <span className="text-xs text-[var(--bj-text)] opacity-60 flex-shrink-0">{c.lastTime}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-sm text-[var(--bj-text)] opacity-75 truncate">{c.lastMessage}</span>
                  {c.unread > 0 && (
                    <span className="text-xs font-bold bg-[var(--bj-yellow)] text-[var(--bj-navy)] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filteredChats.length === 0 && (
            <div className="text-center py-10 text-[var(--bj-text)] opacity-70">Nenhuma conversa.</div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default ChatPage;
