import React, { useState, useEffect, useRef } from "react";
import { fetchInquiryMessages, sendInquiryMessage } from "../services/InquiryAPI";
import { Send, MessageSquare, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function InquiryChatbox({ inquiryId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  // Determine current sender role and ID to highlight own messages
  const currentRole = currentUser?.role || "user";
  const currentUserId = currentUser?.admin_id || currentUser?.sub_admin_id || currentUser?.employee_id || currentUser?.user_id;

  const loadMessages = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetchInquiryMessages(inquiryId);
      if (res.success) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error("Failed to load inquiry messages", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // 3-second polling for simple, 100% reliable real-time updates
    const interval = setInterval(() => {
      loadMessages(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [inquiryId]);

  useEffect(() => {
    // Auto-scroll to bottom of the messages list container specifically, preventing parent page scrolls
    const container = chatEndRef.current?.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const txt = newMessage;
    setNewMessage("");

    try {
      const res = await sendInquiryMessage(inquiryId, txt);
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
      } else {
        toast.error("Failed to send message.");
      }
    } catch (err) {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const getSenderRoleBadge = (type) => {
    switch (type?.toLowerCase()) {
      case "admin":
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-100 text-red-700 tracking-wider">Admin</span>;
      case "subadmin":
      case "sub_admin":
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-100 text-purple-700 tracking-wider">Sub Admin</span>;
      case "customer_service":
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-100 text-blue-700 tracking-wider">CS</span>;
      case "staff":
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-gray-100 text-gray-700 tracking-wider">Staff</span>;
      case "user":
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-700 tracking-wider">Customer</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-black shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900 px-6 py-4 flex items-center justify-between border-b border-black">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[#FDE31E]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none">Inquiry Chatbox</h3>
            <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Direct negotiation channel</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 custom-scrollbar min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-300">
            <MessageSquare className="w-8 h-8 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">No messages yet</p>
            <p className="text-[9px] font-medium text-gray-400 mt-1 max-w-[200px] leading-relaxed">Discuss and negotiate price, size, or schedules here.</p>
          </div>
        ) : (
          messages.map((msg) => {
            // Determine if the message is from the logged-in user
            const isOwn = (msg.sender_type === currentRole && msg.sender_id === currentUserId) || 
                          (msg.sender_type === "user" && currentRole === "user") || 
                          (["admin", "subadmin", "sub_admin", "customer_service", "staff"].includes(msg.sender_type) && currentRole !== "user" && msg.sender_type === currentRole);

            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[9px] font-black uppercase text-gray-500">{msg.sender_name}</span>
                  {getSenderRoleBadge(msg.sender_type)}
                </div>

                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                    isOwn
                      ? "bg-[#FDE31E] text-black rounded-tr-none border border-black"
                      : "bg-white text-gray-800 border border-black rounded-tl-none"
                  }`}
                >
                  {msg.message}
                </div>

                <span className="text-[8px] text-gray-400 font-bold uppercase mt-1 px-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex-shrink-0 bg-white p-4 border-t border-black flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type message here..."
          className="flex-1 bg-gray-50 border border-black rounded-xl px-4 py-2.5 text-xs font-bold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDE31E] focus:bg-white transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="w-9 h-9 rounded-xl bg-gray-900 hover:bg-black text-white flex items-center justify-center transition-all shadow-md hover:scale-105 disabled:opacity-40 disabled:pointer-events-none border border-black"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
