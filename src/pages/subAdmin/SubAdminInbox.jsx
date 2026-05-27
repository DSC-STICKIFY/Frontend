import React, { useState, useRef, useEffect, useCallback } from "react";

// Assets
import searchB from "../../assets/search.svg";
import links from "../../assets/links.svg";
import send from "../../assets/send.svg";
import emojis from "../../assets/emojis.svg";

// Services
import { fetchConversations, fetchAdminUserMessages, sendAdminMessage, toggleBot } from "../../services/MessageAPI";

// Context
import { useInbox } from "../../context/inboxcontext";

// Echo
import echo from "@/echo";

// ── Sub-components ────────────────────────────────────────────────────────────

const UserAvatar = ({ name, className = "w-12 h-12" }) => {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div className={`${className} rounded-xl bg-gray-50 border border-[#DCDCDC] text-gray-800 flex items-center justify-center font-black flex-shrink-0 shadow-sm`}>
      {initial}
    </div>
  );
};

const SendingDots = () => (
  <span className="flex items-center justify-end gap-1">
    <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
    <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
    <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
  </span>
);

const ProductBadge = ({ name, category }) => {
  const label = name || category || "General";
  return (
    <span
      title={label}
      className="inline-block max-w-[140px] truncate text-[9px] font-black uppercase tracking-widest bg-[#FDE31E]/20 text-yellow-700 border border-[#FDE31E]/40 rounded-full px-2 py-0.5"
    >
      {label}
    </span>
  );
};

const ChatContact = ({ name, lastMessage, time, unread, productName, productCategory, onClick, isSelected, rowNumber }) => {
  const needsAgent = lastMessage?.toLowerCase().includes("talk to a real person");

  return (
    <div
      onClick={onClick}
      className={`flex items-start justify-between p-4 cursor-pointer transition-all rounded-2xl mb-1.5 border ${isSelected
        ? "bg-[#FDE31E]/10 border-[#FDE31E] shadow-sm"
        : needsAgent
          ? "bg-orange-50 border-orange-200 hover:bg-orange-100 shadow-sm"
          : "hover:bg-gray-50 border-transparent"
        }`}
    >
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        {/* Row number */}
        <span className="text-[11px] font-black text-gray-400 w-5 text-right flex-shrink-0 mt-1">{rowNumber}</span>
        <UserAvatar name={name} className={`w-10 h-10 text-xs flex-shrink-0 ${needsAgent && !isSelected ? 'bg-orange-100 border-orange-200' : ''}`} />
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 truncate">{name}</span>
            {needsAgent && (
              <span className="bg-orange-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-tighter">Needs Agent</span>
            )}
          </div>
          {(productName || productCategory) && (
            <ProductBadge name={productName} category={productCategory} />
          )}
          <span className={`text-[11px] truncate max-w-[150px] font-medium italic ${needsAgent ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
            {needsAgent ? "⚠️ Requesting Human Agent" : lastMessage}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
        <span className={`text-[9px] font-black uppercase tracking-tighter ${needsAgent ? 'text-orange-400' : 'text-gray-300'}`}>{time}</span>
        {unread > 0 && (
          <div className="bg-[#FDE31E] text-black text-[10px] font-black rounded-lg min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm border border-yellow-200">
            {unread}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const SubAdminInbox = () => {
  const { updateUnread } = useInbox();

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const isMessageFromAdmin = useCallback((msg, contactUserId) => {
    const adminTypes = ["admin", "subadmin", "sub_admin", "artist"];
    if (msg.sender_type && adminTypes.includes(msg.sender_type.toLowerCase())) return true;
    if (msg.sender_type === "user" || msg.sender_type === "customer") return false;
    if (contactUserId && msg.sender_id === contactUserId) return false;
    if (contactUserId && msg.receiver_id === contactUserId) return true;
    return true;
  }, []);

  const resolveImage = (img) => {
    if (!img) return null;
    if (img.startsWith("http") || img.startsWith("data:")) return img;
    const base = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    const path = img.startsWith("/") ? img.slice(1) : img;
    return `${base}/storage/${path}`;
  };

  const formatMsg = useCallback((msg, contactUserId) => {
    const isAdmin = isMessageFromAdmin(msg, contactUserId);
    let content = msg.body || msg.message || msg.text || "";
    if (content.startsWith("[DESIGN]")) content = content.replace("[DESIGN]", "").trim();

    return {
      id: msg.id ? `msg-${msg.id}` : `temp-${Date.now()}`,
      isAdmin,
      isBot: !!msg.is_bot,
      content,
      imageUrl: resolveImage(msg.image || msg.imageUrl || null),
      timestamp: msg.created_at || msg.createdAt || new Date().toISOString(),
      pending: false,
      raw: msg,
    };
  }, [isMessageFromAdmin]);

  // ── Load conversations ────────────────────────────────────────────────────────

  const buildContactKey = (c) => `${c.userId}_${c.productId ?? "general"}`;

  const loadConversations = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const data = await fetchConversations();
      if (!Array.isArray(data)) return;

      const sorted = [...data].sort((a, b) => {
        const aGeneral = !a.product_id ? 0 : 1;
        const bGeneral = !b.product_id ? 0 : 1;
        if (aGeneral !== bGeneral) return aGeneral - bGeneral;
        return new Date(b.last_at || b.updated_at || 0) - new Date(a.last_at || a.updated_at || 0);
      });

      const seenUsers = new Map();
      for (const conv of sorted) {
        const u = conv.user || {};
        const key = conv.user_id
          || u.email
          || (`${u.first_name || ""} ${u.last_name || ""}`.trim()) || null;
        if (!key || seenUsers.has(key)) continue;
        seenUsers.set(key, conv);
      }

      const deduped = Array.from(seenUsers.values()).map((conv) => {
        const u = conv.user || {};
        const rawLastMsg = conv.last_message || "—";
        const cleanLastMsg = rawLastMsg.replace(/^\[DESIGN\]\s*/i, "").trim();
        return {
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Unknown",
          userId: conv.user_id,
          user: u,
          productId: conv.product_id ?? null,
          productName: conv.product_name ?? null,
          productCategory: conv.product_category ?? null,
          lastMessage: cleanLastMsg,
          time: conv.last_at
            ? new Date(conv.last_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          unread: conv.unread_count || 0,
        };
      });

      setContacts(deduped);

      const savedKey = localStorage.getItem("subadmin_last_selected_key");
      if (savedKey && !selectedContact) {
        const last = deduped.find((c) => buildContactKey(c) === savedKey);
        if (last) setSelectedContact(last);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingContacts(false);
    }
  }, [selectedContact]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const selectContact = (contact) => {
    setSelectedContact(contact);
    localStorage.setItem("subadmin_last_selected_key", buildContactKey(contact));
  };

  // ── Load messages for selected contact ───────────────────────────────────────

  const messagesRef = useRef([]);

  const loadSelectedMessages = useCallback(async (contact, isPolling = false) => {
    if (!contact?.userId) return;
    try {
      if (!isPolling) setLoadingMessages(true);

      const lastId = isPolling && messagesRef.current.length > 0
        ? messagesRef.current[messagesRef.current.length - 1].id.replace('msg-', '')
        : null;
      const data = await fetchAdminUserMessages(contact.userId, contact.productId, lastId);
      const arr = Array.isArray(data) ? data : (data.messages || []);

      if (arr.length === 0 && isPolling) return;

      const formatted = arr.map((msg) => formatMsg(msg, contact.userId));

      setMessages((prev) => {
        const existingIds = new Set(prev.map(m => m.id));
        const newOnly = formatted.filter(m => !existingIds.has(m.id));
        if (newOnly.length === 0) return prev;
        const next = [...prev.filter(m => !m.pending), ...newOnly];
        messagesRef.current = next;
        return next;
      });

    } catch (err) {
      if (!isPolling) console.error("Failed to load messages:", err);
    } finally {
      if (!isPolling) setLoadingMessages(false);
    }
  }, [formatMsg]);

  useEffect(() => {
    if (!selectedContact) return;
    const interval = setInterval(() => {
      loadSelectedMessages(selectedContact, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedContact, loadSelectedMessages]);

  useEffect(() => {
    if (selectedContact) {
      messagesRef.current = [];
      setMessages([]);
      loadSelectedMessages(selectedContact);
    }
  }, [selectedContact]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time listener (admin side) ──────────────────────────────────────────

  useEffect(() => {
    if (!selectedContact?.userId) return;

    const channel = echo
      .private(`chat.${selectedContact.userId}`)
      .listen(".MessageSent", (e) => {
        const msgData = e.message || e;

        const incomingPid = msgData.product_id ?? null;
        const selectedPid = selectedContact.productId ?? null;
        if (String(incomingPid) !== String(selectedPid)) return;

        const newMsg = formatMsg(msgData, selectedContact.userId);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        loadConversations();
      });

    return () => { channel.stopListening(".MessageSent"); };
  }, [selectedContact, formatMsg, loadConversations]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollContainerRef.current && !loadingMessages) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [messages, loadingMessages]);

  // ── Outside click closes emoji picker ────────────────────────────────────────

  useEffect(() => {
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setEmojiPickerVisible(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Send handlers ─────────────────────────────────────────────────────────────

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedContact) return;

    const productId = selectedContact.productId ?? null;

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      isAdmin: true,
      content: "",
      imageUrl: URL.createObjectURL(file),
      timestamp: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await sendAdminMessage(null, selectedContact.userId, file, productId);
      const real = res.message || res;
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? formatMsg(real, selectedContact.userId) : m));
      loadConversations();
    } catch (err) {
      console.error("Upload failed:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedContact) return;
    const content = message.trim();
    const productId = selectedContact.productId ?? null;

    setMessage("");
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      isAdmin: true,
      content,
      timestamp: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await sendAdminMessage(content, selectedContact.userId, null, productId);
      const real = res.message || res;
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? formatMsg(real, selectedContact.userId) : m));
      loadConversations();
    } catch (err) {
      console.error("Send failed:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessage(content);
    }
  };

  const handleEmojiClick = (emoji) => { setMessage((p) => p + emoji); setEmojiPickerVisible(false); };

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    return c.productId === null;
  });

  const sampleEmojis = ["😀", "😂", "😍", "😎", "👍", "🙏", "💖", "🥳", "🔥", "✨", "🤝", "💯"];

  // ── Render a single message bubble ───────────────────────────────────────────

  const renderMsg = (msg) => (
    <div key={msg.id} className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"} mb-5`}>
      <div className={`flex items-end gap-3 max-w-[75%] ${msg.isAdmin ? "flex-row-reverse" : ""}`}>
        {!msg.isAdmin && <UserAvatar name={selectedContact?.name} className="w-9 h-9 text-xs" />}
        <div className={`flex flex-col gap-1.5 ${msg.isAdmin ? "items-end" : "items-start"}`}>
          <div
            className={`px-5 py-4 rounded-[28px] shadow-sm border transition-all
              ${msg.isAdmin
                ? "bg-[#FDE31E] border-[#FDE31E] text-black rounded-br-none font-bold"
                : "bg-white border-[#DCDCDC] text-gray-900 rounded-tl-none font-medium"}
              ${msg.pending ? "opacity-70 scale-95" : "scale-100"}`}
          >
            {msg.isAdmin && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${msg.isBot
                  ? 'bg-gray-50 border-gray-200 text-gray-500'
                  : 'bg-yellow-100 border-yellow-200 text-yellow-800'
                  }`}>
                  {msg.isBot ? '🤖 BOT ASSISTANT' : '👤 HUMAN AGENT'}
                </span>
              </div>
            )}
            {msg.imageUrl && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-gray-100 shadow-md bg-white group">
                <img
                  src={msg.imageUrl}
                  alt="attachment"
                  className="w-full h-auto object-contain max-h-[350px] block transition-transform group-hover:scale-105"
                  style={{ minWidth: "220px" }}
                  onError={(e) => { e.target.parentElement.style.display = "none"; }}
                />
              </div>
            )}
            {msg.content && <p className="text-[14px] whitespace-pre-wrap leading-relaxed tracking-tight">{msg.content}</p>}
            <div className={`text-[9px] mt-2 text-right font-black uppercase tracking-[0.1em] ${msg.isAdmin ? "text-yellow-900/60" : "text-gray-400"}`}>
              {msg.pending ? <SendingDots /> : new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <div className="lg:rounded-3xl lg:my-5 lg:mr-5 lg:ml-1 h-screen lg:h-[calc(100vh-2.5rem)] flex flex-col lg:flex-row gap-0 lg:gap-4 overflow-hidden bg-[#F1F3F7] lg:bg-transparent">

      {/* Sidebar - Contacts List */}
      <div className={`flex flex-col h-full w-full lg:w-[360px] flex-shrink-0 transition-all duration-300 ${selectedContact ? 'hidden lg:flex' : 'flex'}`}>
        <div className="mb-4 lg:mb-6 p-5 lg:p-0 bg-white lg:bg-transparent border-b lg:border-none border-gray-200 lg:pt-0 pt-20 lg:block flex flex-col">
          <h1 className="text-xl lg:text-2xl font-black text-gray-900 mb-1 italic uppercase tracking-tighter">Message Center</h1>
          <p className="text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-widest px-0.5">Manage customer inquiries</p>
        </div>

        <div className="px-5 lg:px-0 flex flex-col flex-1 overflow-hidden pb-4">
          {/* Search */}
          <div className="flex items-center bg-white lg:bg-gray-50 border border-[#DCDCDC] rounded-[20px] h-12 px-4 mb-4 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#FDE31E]/10 transition-all">
            <img src={searchB} alt="search" className="w-4 h-4 opacity-30" />
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-sm pl-3 font-medium placeholder:text-gray-300"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Contact count */}
          {!loadingContacts && filteredContacts.length > 0 && (
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 px-1">
              {filteredContacts.length} conversation{filteredContacts.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Contact list */}
          <div className="bg-white border border-[#DCDCDC] rounded-[28px] lg:rounded-[32px] flex-1 overflow-y-auto p-2 custom-scrollbar shadow-sm">
            {loadingContacts ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#FDE31E] rounded-full animate-spin" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">
                  No conversations
                </p>
              </div>
            ) : (
              filteredContacts.map((contact, index) => (
                <ChatContact
                  key={buildContactKey(contact)}
                  {...contact}
                  rowNumber={index + 1}
                  onClick={() => selectContact(contact)}
                  isSelected={selectedContact && buildContactKey(selectedContact) === buildContactKey(contact)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 bg-white lg:border lg:border-[#DCDCDC] lg:rounded-[40px] flex flex-col overflow-hidden shadow-sm transition-all duration-300 ${selectedContact ? 'flex' : 'hidden lg:flex'}`}>
        {selectedContact ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-7 border-b border-[#DCDCDC]/50 bg-white/80 backdrop-blur-md sticky top-0 z-20 pt-16 lg:pt-7">
              {/* Mobile Back Button */}
              <button
                onClick={() => setSelectedContact(null)}
                className="lg:hidden p-2 -ml-1 text-gray-400 hover:text-black transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <UserAvatar name={selectedContact.name} className="w-10 h-10 lg:w-12 lg:h-12 text-xs lg:text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-gray-900 text-[15px] lg:text-base italic uppercase tracking-tighter block truncate">
                    {selectedContact.name}
                  </span>
                  {selectedContact.lastMessage?.toLowerCase().includes("talk to a real person") && (
                    <span className="bg-orange-100 text-orange-600 text-[8px] font-black uppercase px-2 py-1 rounded-full border border-orange-200 tracking-widest animate-pulse">
                      Human Support Required
                    </span>
                  )}
                </div>
                <p className="text-[9px] lg:text-[10px] font-black text-[#FDE31E] uppercase tracking-[0.2em] truncate">
                  {selectedContact.user?.email || "Customer"}
                </p>
              </div>

              {selectedContact.productName || selectedContact.productCategory ? (
                <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-[#FDE31E]/10 text-yellow-700 border-[#FDE31E]/30 max-w-[160px] truncate">
                  📦 {selectedContact.productName || selectedContact.productCategory}
                </span>
              ) : null}

              {/* Bot Toggle Button */}
              <button
                onClick={async () => {
                  try {
                    const res = await toggleBot(selectedContact.userId);
                    if (res.success) {
                      setSelectedContact(prev => ({
                        ...prev,
                        user: { ...prev.user, is_bot_active: res.is_bot_active }
                      }));
                      setContacts(prev => prev.map(c =>
                        c.userId === selectedContact.userId
                          ? { ...c, user: { ...c.user, is_bot_active: res.is_bot_active } }
                          : c
                      ));
                    }
                  } catch (err) {
                    console.error("Failed to toggle bot:", err);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${selectedContact.user?.is_bot_active
                  ? "bg-green-50 border-green-200 text-green-600"
                  : "bg-gray-100 border-gray-300 text-gray-500"
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedContact.user?.is_bot_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {selectedContact.user?.is_bot_active ? "Bot Active" : "Bot Disabled"}
                </span>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-1 p-5 lg:p-10 overflow-y-auto bg-gray-50/30 flex flex-col custom-scrollbar">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#DCDCDC] border-t-[#FDE31E] rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4 opacity-40">
                  <p className="font-black uppercase tracking-[0.2em] italic text-xs">No messages yet.</p>
                </div>
              ) : (
                messages.map(renderMsg)
              )}
            </div>

            {/* Quick Replies */}
            <div className="px-4 lg:px-10 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-white">
              {[
                { label: "👋 Greet", text: "Hello! How can I help you today?" },
                { label: "🤝 Take Over", text: "Hi! This is a support agent taking over. How can I assist you?" },
                { label: "⏳ Wait", text: "Please wait a moment while I check your request." },
                { label: "✅ Solved", text: "Is there anything else I can help you with?" }
              ].map((reply, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(reply.text)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-[#FDE31E] hover:text-black hover:border-[#FDE31E] transition-all active:scale-95 shadow-sm"
                >
                  {reply.label}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div className="flex items-center border-t border-[#DCDCDC]/50 gap-2 lg:gap-4 p-4 lg:p-6 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] pb-8 lg:pb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gray-50 border border-[#DCDCDC] flex items-center justify-center flex-shrink-0"
              >
                <img src={links} alt="attach" className="h-4 lg:h-5 opacity-30" />
              </button>
              <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />

              <div className="flex-1 border border-[#DCDCDC] rounded-[20px] lg:rounded-[24px] px-4 lg:px-6 py-3 lg:py-4 bg-gray-50/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#FDE31E]/10 transition-all">
                <textarea
                  placeholder="Reply..."
                  className="w-full resize-none outline-none bg-transparent text-sm py-1 max-h-32 font-bold placeholder:text-gray-300"
                  value={message}
                  rows={1}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                />
              </div>

              {/* Emoji picker */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setEmojiPickerVisible((p) => !p)}
                >
                  <img src={emojis} alt="emoji" className="h-4 opacity-40" />
                </button>
                {emojiPickerVisible && (
                  <div className="absolute bottom-full right-0 mb-3 bg-white p-4 rounded-3xl shadow-2xl border border-[#DCDCDC] flex gap-2 flex-wrap w-[260px] z-50">
                    {sampleEmojis.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => handleEmojiClick(emoji)}
                        className="text-2xl hover:bg-gray-50 p-2.5 rounded-3xl transition-transform active:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="h-12 w-12 lg:h-14 lg:w-14 flex items-center justify-center rounded-xl lg:rounded-2xl bg-[#FDE31E] shadow-lg disabled:opacity-40 flex-shrink-0"
              >
                <img src={send} alt="send" className="h-4 lg:h-5 translate-x-0.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-8 bg-gray-50/20">
            <div className="w-24 h-24 rounded-[40px] border-4 border-dashed border-[#DCDCDC] flex items-center justify-center bg-white shadow-sm animate-pulse">
              <img src={send} alt="select" className="h-10 grayscale opacity-20" />
            </div>
            <div className="text-center">
              <p className="font-black uppercase tracking-[0.3em] italic text-sm mb-1 opacity-40">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubAdminInbox;