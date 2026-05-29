import React, { useState, useRef, useEffect } from "react";
import { sendCustomerMessage, fetchCustomerMessages, fetchAdminUserMessages, sendAdminMessage } from "../services/MessageAPI";
import { approveDesign, requestChange } from "../services/OrdersAPI";
import { useAuth } from "../context/CustomerAuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import echo from "../echo";

const DesignChatbox = ({ onImageUpload, productId, customerId, orderId, orderStatus: orderStatusProp, isArtistChat = false, onNewMessage, isReadOnly = false, customizationRequestId = null, initialInstructions = null, initialImage = null }) => {
  const { currentUser: customerUser } = useAuth();
  const { currentUser: adminUser } = useAdminAuth();

  const currentUser = customerUser || adminUser;
  const isArtistSide = !!adminUser;
  const effectiveUserId = isArtistSide ? customerId : (currentUser?.user_id || currentUser?.id);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [localPreview, setLocalPreview] = useState(null);
  const [localFile, setLocalFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [orderStatus, setOrderStatus] = useState(orderStatusProp || null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync orderStatus when the prop changes (e.g. parent refreshes order data)
  useEffect(() => {
    if (orderStatusProp) setOrderStatus(orderStatusProp);
  }, [orderStatusProp]);

  const resolveImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith("http") || img.startsWith("data:")) return img;
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = img.startsWith("/") ? img.slice(1) : img;
    return `${cleanBase}/storage/${cleanPath}`;
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser) {
        setChatMessages([
          {
            id: 1,
            from: "bot",
            type: "text",
            text: "Hi! I can help with your design requirements. Please log in to start a design inquiry.",
          },
        ]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = isArtistSide 
          ? await fetchAdminUserMessages(effectiveUserId, productId, null, customizationRequestId)
          : await fetchCustomerMessages(productId, null, customizationRequestId);
        const normalised = (Array.isArray(data) ? data : []).map((m) => {
          let cleanText = m.body || "";
          if (cleanText.startsWith("[DESIGN]")) {
            cleanText = cleanText.replace("[DESIGN]", "").trim();
          }
          return {
            id: m.id,
            from: isArtistSide 
              ? (m.sender_type === "customer" ? "bot" : "user") // Swap for artist perspective: customer is "bot" (other), artist is "user" (me)
              : (m.sender_type === "customer" ? "user" : "bot"), // Customer perspective: customer is "user" (me), others are "bot"
            type: m.image ? "image" : "text",
            text: cleanText,
            image: resolveImageUrl(m.image),
            createdAt: m.created_at,
          };
        });

        // Compute starting context messages from initial customization info if available
        const initialMsgs = [];
        if (initialImage) {
          initialMsgs.push({
            id: "initial-image",
            from: isArtistSide ? "bot" : "user", // Left for artist side (from customer), Right for customer side (from me)
            type: "image",
            image: resolveImageUrl(initialImage),
            text: "Uploaded reference image",
          });
        }
        if (initialInstructions) {
          initialMsgs.push({
            id: "initial-instruction",
            from: isArtistSide ? "bot" : "user", // Left for artist side (from customer), Right for customer side (from me)
            type: "text",
            text: `📋 Customer Instructions: "${initialInstructions}"`,
          });
        }

        if (normalised.length === 0) {
          if (initialMsgs.length > 0) {
            setChatMessages(initialMsgs);
          } else {
            if (!isArtistSide) {
              setChatMessages([
                {
                  id: "welcome",
                  from: "bot",
                  type: "text",
                  text: "Hi! I can help with your design requirements. Send a message or upload your reference photo here.",
                },
              ]);
            } else {
              setChatMessages([]);
            }
          }
        } else {
          setChatMessages([...initialMsgs, ...normalised]);
          // Notify parent of the most recent image found in history
          const lastImage = [...normalised].reverse().find(m => m.from === "user" && m.type === "image" && m.image);
          if (lastImage && onImageUpload) {
            onImageUpload(lastImage.image);
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [currentUser, productId, customizationRequestId, initialInstructions, initialImage]);

  // ✅ Polling Fallback (4 seconds) - Backup for sockets
  useEffect(() => {
    if (!currentUser || !productId) return;
    
    const interval = setInterval(async () => {
      try {
        const lastMsgId = chatMessages.length > 0 
          ? [...chatMessages].reverse().find(m => {
              const idStr = String(m.id);
              return !idStr.startsWith('rt-') && 
                     !idStr.startsWith('ai-') && 
                     !idStr.startsWith('sys-') && 
                     idStr !== 'welcome' && 
                     !m.isPending && 
                     /^\d+$/.test(idStr);
            })?.id 
          : null;
          
        const data = isArtistSide 
          ? await fetchAdminUserMessages(effectiveUserId, productId, lastMsgId, customizationRequestId)
          : await fetchCustomerMessages(productId, lastMsgId, customizationRequestId);
          
        const arr = Array.isArray(data) ? data : (data.messages || []);
        if (arr.length === 0) return;

        const newMsgs = arr.map(m => {
          let cleanText = m.body || "";
          if (cleanText.startsWith("[DESIGN]")) cleanText = cleanText.replace("[DESIGN]", "").trim();
          return {
            id: m.id,
            from: isArtistSide 
              ? (m.sender_type === "customer" ? "bot" : "user")
              : (m.sender_type === "customer" ? "user" : "bot"),
            type: m.image ? "image" : "text",
            text: cleanText,
            image: resolveImageUrl(m.image),
            createdAt: m.created_at,
          };
        });

        setChatMessages(prev => {
          const existingIds = new Set(prev.map(m => String(m.id)));
          const uniqueNew = newMsgs.filter(m => !existingIds.has(String(m.id)));
          if (uniqueNew.length === 0) return prev;
          if (onNewMessage) onNewMessage(); // Notify parent to refresh sidebar
          return [...prev, ...uniqueNew];
        });
      } catch (err) {
        // Silent error for polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentUser, productId, customizationRequestId, chatMessages.length, isArtistSide, effectiveUserId]);

  // ── Real-time listener ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.user_id || currentUser.id;
    if (!userId) return;

    const channelName = isArtistSide && customerId ? `chat.${customerId}` : `chat.${userId}`;
    console.log(`[Chatbox] Attempting to listen on: ${channelName} (Product: ${productId})`);

    const channel = echo.private(channelName);
    
    channel.listen(".MessageSent", (e) => {
      console.log("[Chatbox] Real-time event received:", e);
      const msgData = e.message || e;

      if (!msgData) {
        console.warn("[Chatbox] Received event with no message data");
        return;
      }

      // Only append if it belongs to this product's conversation
      // If productId is null/undefined, we allow all messages on this channel (general chat)
      if (productId && msgData.product_id && String(msgData.product_id) !== String(productId)) {
        console.log(`[Chatbox] Message filtered out. Expected Product: ${productId}, got: ${msgData.product_id}`);
        return;
      }

      // Only add "the other side" replies
      const isOtherSide = isArtistSide 
        ? msgData.sender_type === "customer"
        : (msgData.sender_type !== "customer" && msgData.sender_type !== "user");

      if (!isOtherSide) {
        console.log("[Chatbox] Ignoring own message broadcast");
        return;
      }

      let cleanText = msgData.body || "";
      if (cleanText.startsWith("[DESIGN]")) cleanText = cleanText.replace("[DESIGN]", "").trim();

      const newMsg = {
        id: msgData.id || `rt-${Date.now()}-${Math.random()}`,
        from: "bot",
        type: msgData.image ? "image" : "text",
        text: cleanText,
        image: resolveImageUrl(msgData.image),
        createdAt: msgData.created_at || new Date().toISOString(),
      };

      setChatMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
        if (onNewMessage) onNewMessage(); // Notify parent to refresh sidebar
        return [...prev, newMsg];
      });
      
      console.log("[Chatbox] New message added to UI");
    });

    return () => {
      console.log(`[Chatbox] Cleaning up listener for: ${channelName}`);
      channel.stopListening(".MessageSent");
      // Optionally leave the channel if no other components are using it
      // echo.leave(channelName); 
    };
  }, [currentUser, productId, customerId, isArtistSide]);

  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text && !localFile) return;
    if (!currentUser) {
      alert("Please log in to send messages.");
      return;
    }

    const hasImage = !!localFile;
    setIsSending(true);

    try {
      const tempId = Date.now();
      const optimisticMsg = {
        id: tempId,
        from: "user",
        type: localFile ? "image" : "text",
        text: text,
        image: localPreview,
        isPending: true,
      };
      setChatMessages((prev) => [...prev, optimisticMsg]);
      setChatInput("");

      const contentWithTag = text ? `[DESIGN] ${text}` : "[DESIGN]";
      
      const response = isArtistSide
        ? await sendAdminMessage(contentWithTag, effectiveUserId, localFile, productId, customizationRequestId)
        : await sendCustomerMessage(contentWithTag, localFile, productId, customizationRequestId);

      const msgObj = response?.message || response;

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                id: msgObj?.id,
                text: text,
                image: resolveImageUrl(msgObj?.image) || m.image,
                isPending: false,
              }
            : m
        )
      );

      if (onImageUpload && localPreview) onImageUpload(localPreview);
      setLocalPreview(null);
      setLocalFile(null);

      // ─── Simulated AI Response (Only for non-artist, non-human-chat contexts) ─
      if (!isArtistSide && !isArtistChat && currentUser?.is_bot_active !== false) {
          setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              
              let aiText = "";
              const query = (text || "").toLowerCase().trim();
              
              if (hasImage) {
                aiText = "Thank you for uploading the design! Our design team will inspect the image resolution and layout to ensure it meets our print quality standards.";
              } else if (!query) {
                aiText = "I received your request! If you have a specific design reference, please upload it here.";
              } else if (query.includes("hi") || query.includes("hello") || query.includes("hey") || query.includes("good day")) {
                aiText = "Hello! I am your design assistant. Feel free to ask about sizing, materials, pricing, or upload your reference design here!";
              } else if (query.includes("price") || query.includes("cost") || query.includes("how much") || query.includes("rate") || query.includes("bayad")) {
                aiText = "Pricing depends on the product size and quantity. You can view the size pricing table on the left configuration panel of this page!";
              } else if (query.includes("size") || query.includes("dimension") || query.includes("inch") || query.includes("inches") || query.includes("cm") || query.includes("sukat")) {
                aiText = "We offer sizes from 1.5x1.5 inches up to 9x9 inches for sheet cutouts. You can choose your preferred size in the configuration panel on the right.";
              } else if (query.includes("material") || query.includes("quality") || query.includes("paper") || query.includes("vinyl") || query.includes("glossy") || query.includes("matte") || query.includes("hologram")) {
                aiText = "We use premium, waterproof, and smudge-proof vinyl. You can choose from Glossy, Matte, or Holographic finishes to suit your stickers!";
              } else if (query.includes("lead time") || query.includes("when") || query.includes("how long") || query.includes("kailan") || query.includes("delivery") || query.includes("ship")) {
                aiText = "Our production lead time is typically 2-3 business days after you approve the final layout. Shipping then takes 2-5 days depending on your location.";
              } else if (query.includes("edit") || query.includes("layout") || query.includes("change") || query.includes("design") || query.includes("custom")) {
                aiText = "Our artists can help adjust your designs and layouts! Just upload your reference design here and tell us what changes you want.";
              } else {
                const fallbacks = [
                  "Got it! That looks like a great design choice.",
                  "I've noted your requirements. Our design team will review this shortly.",
                  "Perfect! Let me know if you need any adjustments to dimensions, materials, or layout.",
                  "Thank you for the details! I have saved this in your design inquiry. Feel free to add more details or upload an image."
                ];
                aiText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
              }
              
              setChatMessages(prev => [...prev, {
                id: `ai-${Date.now()}`,
                from: "bot",
                type: "text",
                text: aiText,
                createdAt: new Date().toISOString()
              }]);
            }, 1500);
          }, 800);
      }

    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLocalPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ── Customer: confirm or request change on design ─────────────────────────
  const handleConfirmDesign = async () => {
    if (!orderId) return;
    setConfirmLoading(true);
    try {
      await approveDesign(orderId);
      setOrderStatus('Design Approved');
      setChatMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        from: 'user',
        type: 'text',
        text: '✅ I have confirmed the final design. Ready for production!',
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('Confirm design failed:', err);
      alert('Failed to confirm design. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleRequestChange = async () => {
    if (!orderId) return;
    setConfirmLoading(true);
    try {
      await requestChange(orderId);
      setOrderStatus('Design In Progress');
      setChatMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        from: 'user',
        type: 'text',
        text: '🔄 I\'ve requested a revision. Please check my feedback above.',
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('Request change failed:', err);
      alert('Failed to request change. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    // Fills whatever height the parent gives it — parent must be flex with min-h-0
    <div className="bg-white rounded-[32px] border border-gray-100 flex flex-col h-full overflow-hidden">

      {/* Pinned Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-50 flex-shrink-0 z-10 shadow-sm shadow-gray-50/50">
        <div className={`w-1.5 h-1.5 rounded-full ${isArtistSide ? 'bg-blue-400' : 'bg-[#FFE100]'}`}></div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
          {isArtistSide ? "Customer" : "Design Assistant"}
        </span>
      </div>

      {/* ── Customer Design Confirmation Banner ─────────────────────────── */}
      {!isArtistSide && orderId && orderStatus === 'Finalizing' && (
        <div className="flex-shrink-0 mx-3 mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xl">🎨</span>
            <div>
              <p className="text-[11px] font-black text-green-800 uppercase tracking-widest">Your design is ready for review!</p>
              <p className="text-[10px] text-green-600 font-bold mt-0.5">Check the design above, then confirm or request changes.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDesign}
              disabled={confirmLoading}
              className="flex-1 py-2.5 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              {confirmLoading ? '...' : '✅ Confirm Final Design'}
            </button>
            <button
              onClick={handleRequestChange}
              disabled={confirmLoading}
              className="flex-1 py-2.5 bg-white text-gray-700 border border-gray-200 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              🔄 Request Change
            </button>
          </div>
        </div>
      )}

      {/* Design Approved banner */}
      {!isArtistSide && orderStatus === 'Design Approved' && (
        <div className="flex-shrink-0 mx-3 mt-3 p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2">
          <span className="text-green-500 text-base">✅</span>
          <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Design confirmed! Awaiting production & shipping.</p>
        </div>
      )}

      {/* Message list — scrollable, takes all available space */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar bg-white">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-gray-100 border-t-[#FFE100] rounded-full animate-spin" />
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "user" ? "justify-end" : "items-start gap-3"}`}
            >
              {msg.from === "bot" && (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isArtistSide ? 'bg-blue-50 border border-blue-100' : 'bg-[#FFE100]'}`}>
                  {isArtistSide ? (
                    <span className="text-[10px] font-black text-blue-800">C</span>
                  ) : (
                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                  )}
                </div>
              )}

              <div
                className={`max-w-[85%] ${
                  msg.from === "user" ? "flex flex-col items-end" : "flex flex-col items-start"
                }`}
              >
                {msg.type === "image" && msg.image && (
                  <div
                    className={`mb-1.5 rounded-xl overflow-hidden border-2 shadow-sm transition-transform hover:scale-[1.02] ${
                      msg.from === "user" ? "border-[#FFE100]" : "border-gray-100"
                    }`}
                  >
                    <img
                      src={msg.image}
                      alt="design"
                      className="max-w-[150px] object-cover block"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
                {msg.text && (
                  <div
                    className={`px-3 py-1.5 rounded-xl text-[11px] leading-snug ${
                      msg.from === "user"
                        ? "bg-[#FFE100] text-black font-bold shadow-sm"
                        : "bg-gray-50 text-gray-700 border border-gray-100 shadow-sm"
                    } ${msg.isPending ? "opacity-50" : ""}`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <div className="bg-gray-50 px-3 py-1.5 rounded-xl text-[10px] text-gray-400 font-bold italic">
              {isArtistSide ? "Customer is typing..." : "AI Assistant is typing..."}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area — always pinned to the bottom */}
      {isReadOnly ? (
        <div className="flex-shrink-0 p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center italic">
            🔒 Read-Only Mode: You are observing this conversation
          </p>
        </div>
      ) : (
        <div className="flex-shrink-0 p-4 bg-white border-t border-gray-50">
        {localPreview && (
          <div className="mb-3 relative w-16 h-16 rounded-xl overflow-hidden border-2 border-[#FFE100] shadow-md">
            <img src={localPreview} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setLocalPreview(null);
                setLocalFile(null);
              }}
              className="absolute inset-0 bg-black/40 text-white flex items-center justify-center font-bold text-lg"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 hover:bg-gray-100 transition-all border border-gray-100 group disabled:opacity-50"
          >
            <svg
              className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2 flex items-center shadow-sm focus-within:border-[#FFE100] transition-all relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isSending && handleSend()}
              placeholder={currentUser ? "Type design info..." : "Login to chat..."}
              disabled={isSending || !currentUser}
              className="w-full bg-transparent outline-none text-[11px] text-gray-800 placeholder:text-gray-300 font-medium"
            />
            {!currentUser && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                <button
                  onClick={() => (window.location.href = "/login")}
                  className="bg-[#FFE100] text-black text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm hover:scale-105 transition-transform"
                >
                  Log In
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={isSending || (!chatInput.trim() && !localFile)}
            className="w-10 h-10 rounded-xl bg-[#FFE100] flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-200/50 hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5 text-black translate-x-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

export default DesignChatbox;