import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";

// Assets
import links from "../../assets/links.svg";
import send from "../../assets/send.svg";
import emojis from "../../assets/emojis.svg";
import adminAvatar from "../../assets/dscLogo.png";

// Context & Echo
import { useAuth } from '../../context/CustomerAuthContext';
import { useInbox } from "../../context/inboxcontext";
import echo from "@/echo";

// Services
import { fetchMessages, sendCustomerMessage, fetchFaqs, sendBotMessage } from "../../services/MessageAPI";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm";
const MAX_FILE_SIZE_MB = 50;

const validateFile = (file) => {
    const acceptedMimes = ACCEPTED_TYPES.split(",");
    if (!acceptedMimes.includes(file.type)) {
        return "File type not supported. Allowed: JPG, PNG, GIF, WEBP, MP4, MOV, WEBM.";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
};

const SendingDots = () => (
    <span className="flex items-center justify-end gap-1">
        <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
);

const FilePreviewBadge = ({ file, preview, onRemove }) => {
    const isVideo = file?.type?.startsWith("video/");
    return (
        <div className="px-4 pt-3 flex items-start gap-3">
            <div className="relative inline-block">
                {isVideo ? (
                    <video src={preview} className="max-h-28 max-w-[200px] rounded-xl border border-gray-300 bg-black" controls />
                ) : (
                    <img src={preview} alt="preview" className="max-h-28 max-w-[200px] object-cover rounded-xl border border-gray-300" />
                )}
                <button
                    onClick={onRemove}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow transition"
                >✕</button>
            </div>
            <div className="text-xs text-gray-500 mt-1 max-w-[140px]">
                <p className="font-medium text-gray-700 truncate">{file?.name}</p>
                <p className="text-gray-400 mt-0.5">{(file?.size / (1024 * 1024)).toFixed(2)} MB</p>
                <p className="mt-0.5 text-blue-500">{isVideo ? "🎬 Video" : "🖼️ Image"}</p>
            </div>
        </div>
    );
};

const CustomerInbox = () => {
    const { currentUser } = useAuth();
    const { updateUnread } = useInbox();
    const userId = currentUser?.user_id || currentUser?.id;

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
    const [sendError, setSendError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileError, setFileError] = useState(null);
    const [faqs, setFaqs] = useState([]);
    const [isAdminTyping, setIsAdminTyping] = useState(false);

    const emojiPickerRef = useRef(null);
    const fileInputRef = useRef(null);
    const desktopBottomRef = useRef(null);
    const mobileBottomRef = useRef(null);

    const adminContact = { name: "Admin Support", avatar: adminAvatar };

    const scrollToBottom = () => {
        desktopBottomRef.current?.scrollIntoView({ behavior: "auto" });
        mobileBottomRef.current?.scrollIntoView({ behavior: "auto" });
    };

    useEffect(() => {
        return () => { if (filePreview) URL.revokeObjectURL(filePreview); };
    }, [filePreview]);

    const clearFile = () => {
        if (filePreview) URL.revokeObjectURL(filePreview);
        setSelectedFile(null);
        setFilePreview(null);
        setFileError(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const error = validateFile(file);
        if (error) { setFileError(error); return; }
        if (filePreview) URL.revokeObjectURL(filePreview);
        setFileError(null);
        setSelectedFile(file);
        setFilePreview(URL.createObjectURL(file));
    };

    // ✅ Fixed — added `read` field mapping + case-insensitive isAdmin
    const formatMsg = useCallback((msg) => {
        let content = msg.body || msg.message || "";
        if (content.startsWith("[DESIGN]")) {
            content = content.replace("[DESIGN]", "").trim();
        }
        return {
            id: `msg-${msg.id}`,
            isAdmin: ["admin", "subadmin", "sub_admin"].includes(msg.sender_type?.toLowerCase()),
            content: content,
            image: msg.image ? `http://127.0.0.1:8000/storage/${msg.image}` : null,
            video: msg.video ? `http://127.0.0.1:8000/storage/${msg.video}` : null,
            timestamp: msg.created_at,
            read: msg.is_read ?? false, // ✅ map is_read from backend
            pending: false,
        };
    }, []);

    // ✅ Optimized loadMessages to support polling
    const loadMessages = useCallback(async (isPolling = false) => {
        if (!userId) { setLoading(false); return; }
        try {
            // Use the last message ID for optimized polling
            const lastId = messages.length > 0 ? messages[messages.length - 1].id.replace('msg-', '') : null;
            const res = await fetchMessages(null, isPolling ? lastId : null);
            const data = res.messages || res || [];
            if (data.length === 0 && isPolling) return; // No new messages

            const formatted = data.map(formatMsg);
            setMessages((prev) => {
                const existingIds = new Set(prev.map(m => m.id));
                const newOnly = formatted.filter(m => !existingIds.has(m.id));
                if (newOnly.length === 0) return prev;

                const serverContents = new Set(formatted.map((m) => m.content));
                const pendingOnly = prev.filter((m) => m.pending && !serverContents.has(m.content));
                return [...prev.filter(m => !m.pending), ...newOnly, ...pendingOnly];
            });
            updateUnread(0);
        } catch (err) {
            if (!isPolling) console.error("Failed to load messages:", err);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [userId, formatMsg, updateUnread, messages]);

    // ✅ Polling Interval (3 seconds) — The "Surefire" Real-time fallback
    useEffect(() => {
        if (!userId) return;
        const interval = setInterval(() => {
            loadMessages(true);
        }, 3000);
        return () => clearInterval(interval);
    }, [userId, loadMessages]);

    useLayoutEffect(() => {
        if (!loading && messages.length > 0) {
            scrollToBottom();
            const t = setTimeout(scrollToBottom, 100);
            return () => clearTimeout(t);
        }
    }, [messages, loading]);

    // ✅ Clear badge immediately on mount
    useEffect(() => { updateUnread(0); }, [updateUnread]);
    useEffect(() => { 
        loadMessages(); 
        const loadFaqs = async () => {
            try {
                const data = await fetchFaqs();
                setFaqs(data);
            } catch (err) {
                console.error("Failed to load FAQs:", err);
            }
        };
        loadFaqs();
    }, []); // Initial load only

    // ✅ Keep Pusher as "Instant" fallback
    useEffect(() => {
        if (!userId) return;
        const channel = echo.private(`chat.${userId}`).listen(".MessageSent", (e) => {
            const msgData = e.message || e;
            const newMsg = formatMsg(msgData);
            setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                const filtered = prev.filter((m) => !(m.pending && m.content === newMsg.content));
                return [...filtered, newMsg];
            });
        });
        return () => channel.stopListening(".MessageSent");
    }, [userId, formatMsg]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setEmojiPickerVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSend = async () => {
        const hasText = message.trim().length > 0;
        const hasFile = !!selectedFile;
        setSendError(null);
        if (!hasText && !hasFile) { setSendError("Cannot send empty message."); return; }
        if (!userId) { setSendError("You are not logged in."); return; }
        if (isSending) return;

        const content = message.trim();
        const fileToSend = selectedFile;
        setMessage("");
        clearFile();
        setIsSending(true);

        const optimisticId = `optimistic-${Date.now()}`;
        let optimisticBlobUrl = null;
        let optimisticVideoUrl = null;
        if (fileToSend?.type.startsWith("image/")) optimisticBlobUrl = URL.createObjectURL(fileToSend);
        if (fileToSend?.type.startsWith("video/")) optimisticVideoUrl = URL.createObjectURL(fileToSend);

        setMessages((prev) => [
            ...prev,
            {
                id: optimisticId,
                isAdmin: false,
                content,
                image: optimisticBlobUrl,
                video: optimisticVideoUrl,
                timestamp: new Date().toISOString(),
                pending: true,
            },
        ]);

        try {
            await sendCustomerMessage(content, fileToSend);
            await loadMessages();
        } catch (err) {
            console.error("Send error:", err);
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setMessage(content);
            if (fileToSend) {
                setSelectedFile(fileToSend);
                if (fileToSend.type.startsWith("image/") || fileToSend.type.startsWith("video/")) {
                    setFilePreview(URL.createObjectURL(fileToSend));
                }
            }
            setSendError(err.message || "Failed to send message. Please try again.");
        } finally {
            setIsSending(false);
            if (optimisticBlobUrl) URL.revokeObjectURL(optimisticBlobUrl);
            if (optimisticVideoUrl) URL.revokeObjectURL(optimisticVideoUrl);
        }
    };

    const handleFaqClick = async (faq) => {
        if (isSending || isAdminTyping) return;

        setIsSending(true);
        const question = faq.question;
        const answer = faq.answer;
        
        const userMsgId = `faq-q-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: userMsgId,
            isAdmin: false,
            content: question,
            timestamp: new Date().toISOString(),
            pending: true
        }]);

        try {
            await sendCustomerMessage(question);
            // ✅ Load messages first to ensure the Question is displayed on screen from the server
            await loadMessages(); 
            
            // ✅ Only then start the "Admin is typing" simulation
            setIsAdminTyping(true);
            setTimeout(() => {
                setIsAdminTyping(false);
                
                const botMsgId = `faq-a-${Date.now()}`;
                const newBotMsg = {
                    id: botMsgId,
                    isAdmin: true,
                    content: answer,
                    timestamp: new Date().toISOString(),
                    pending: false
                };
                setMessages(prev => [...prev, newBotMsg]);
                setTimeout(scrollToBottom, 50);

                // ✅ Save Bot Reply to Database so Admin can see it
                sendBotMessage(answer).catch(e => console.error("Failed to save bot reply:", e));
            }, 2000); // Slightly longer delay for a more natural feel

        } catch (err) {
            console.error("FAQ send error:", err);
        } finally {
            setIsSending(false);
        }
    };

    const UserAvatar = ({ name }) => {
        const initial = name?.charAt(0)?.toUpperCase() || "?";
        return (
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {initial}
            </div>
        );
    };

    const handleEmojiClick = (emoji) => {
        setMessage((prev) => prev + emoji);
        setEmojiPickerVisible(false);
    };

    const emojiList = [
        "😊","😂","❤️","😍","👍","🙏","🎉","🔥","😎","🤔",
        "😢","😡","👌","✨","💪","🌟","😜","🤗","🤩","😴",
        "🤝","💯","🙌","🤫","😋","🫶","💖","🌹","✌️","🤞",
    ];

    const renderMsg = (msg) => (
        <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.isAdmin ? "self-start" : "self-end flex-row-reverse"}`}
        >
            {msg.isAdmin ? (
                <img src={adminAvatar} alt="Admin" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
                <UserAvatar name={currentUser?.first_name} />
            )}
            <div className={`max-w-[70%] px-4 py-3 rounded-2xl break-words transition-opacity duration-300 ${
                msg.isAdmin
                    ? "bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm"
                    : "bg-blue-500 text-white rounded-br-none"
            } ${msg.pending ? "opacity-60" : "opacity-100"}`}>
                {msg.isAdmin && (
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${
                            currentUser?.is_bot_active === false 
                                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}>
                            {currentUser?.is_bot_active === false ? '👤 LIVE AGENT' : '🤖 BOT ASSISTANT'}
                        </span>
                    </div>
                )}
                {msg.content && <p className="text-[15px] leading-relaxed">{msg.content}</p>}
                {msg.image && (
                    <div className="mt-2">
                        <img
                            src={msg.image}
                            alt="Attachment"
                            className="max-h-56 rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(msg.image, "_blank")}
                            onLoad={scrollToBottom}
                        />
                    </div>
                )}
                {msg.video && (
                    <div className="mt-2">
                        <video src={msg.video} controls className="max-h-56 w-full rounded-xl border border-gray-200" />
                    </div>
                )}
                <div className={`text-[10px] mt-1 text-right ${msg.isAdmin ? "text-gray-400" : "text-blue-100"}`}>
                    {msg.pending ? (
                        <SendingDots />
                    ) : (
                        new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    )}
                </div>
            </div>
        </div>
    );
 
    const inputArea = (mobile = false) => (
        <div className={`bg-white ${mobile ? "border-t border-gray-200" : "border-t-2 border-gray-200 flex-shrink-0"}`}>
            {/* Dynamic FAQ Chips */}
            {faqs.length > 0 && currentUser?.is_bot_active !== false && (
                <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-100 bg-white/50">
                    {faqs.map((faq) => (
                        <button
                            key={faq.id}
                            onClick={() => handleFaqClick(faq)}
                            disabled={isSending || isAdminTyping}
                            className="whitespace-nowrap px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors active:scale-95 disabled:opacity-50"
                        >
                            {faq.question}
                        </button>
                    ))}
                    {/* Special "Talk to Agent" Button */}
                    <button
                        onClick={() => handleFaqClick({ 
                            question: "I'd like to talk to a real person.", 
                            answer: "Certainly! I am now connecting you to one of our staff members. Please wait a moment while we notify them." 
                        })}
                        disabled={isSending || isAdminTyping}
                        className="whitespace-nowrap px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold hover:bg-orange-100 transition-colors active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <span>📞</span> Talk to a Person
                    </button>
                </div>
            )}
            
            {sendError && (
                <div className="px-4 pt-2 text-xs text-red-500 flex items-center gap-1">
                    ⚠️ {sendError}
                    <button onClick={() => setSendError(null)} className="ml-2 underline">Dismiss</button>
                </div>
            )}
            {fileError && (
                <div className="px-4 pt-2 text-xs text-red-500 flex items-center gap-1">
                    ⚠️ {fileError}
                    <button onClick={() => setFileError(null)} className="ml-2 underline">Dismiss</button>
                </div>
            )}
            {selectedFile && filePreview && (
                <FilePreviewBadge file={selectedFile} preview={filePreview} onRemove={clearFile} />
            )}
            <div className="flex items-center gap-3 p-3">
                <button onClick={() => fileInputRef.current?.click()} disabled={isSending} title="Attach photo or video">
                    <img src={links} alt="attach" className="h-6 cursor-pointer hover:opacity-70" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept={ACCEPTED_TYPES} onChange={handleFileChange} />
                <div className="flex-1 border border-gray-300 rounded-2xl px-4 py-2 focus-within:border-blue-400 transition">
                    <textarea
                        placeholder="Type a message..."
                        className="w-full resize-none outline-none bg-transparent text-sm py-1 max-h-32"
                        style={{ lineHeight: "1.4rem" }}
                        value={message}
                        rows={1}
                        disabled={isSending}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                    />
                </div>
                <div className="relative">
                    <button onClick={() => setEmojiPickerVisible((prev) => !prev)} disabled={isSending}>
                        <img src={emojis} alt="emoji" className="h-5 cursor-pointer hover:opacity-70" />
                    </button>
                    {emojiPickerVisible && (
                        <div
                            ref={emojiPickerRef}
                            className="absolute bottom-full right-0 mb-2 bg-white p-3 rounded-2xl shadow-lg border border-gray-200 flex flex-wrap gap-2 w-[260px] z-50"
                        >
                            {emojiList.map((emoji, i) => (
                                <button key={i} onClick={() => handleEmojiClick(emoji)} className="text-3xl hover:bg-gray-100 p-2 rounded-xl transition">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSend}
                    disabled={(!message.trim() && !selectedFile) || isSending}
                    className="p-3 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-95 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                    {isSending ? <SendingDots /> : <img src={send} alt="send" className="h-4" />}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* DESKTOP */}
            <div className="hidden lg:flex rounded-3xl my-5 mr-5 ml-1 h-[calc(100vh-2.5rem)]">
                <div className="flex-1 h-full bg-white border-2 border-gray-200 rounded-3xl flex flex-col overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 p-5 border-b border-[#DCDCDC] flex-shrink-0 bg-white">
                        <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-transparent">
                            <img src={adminContact.avatar} alt={adminContact.name} className="w-10 h-10 object-contain" />
                        </div>
                        <div>
                            <span className="font-black text-gray-900">{adminContact.name}</span>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${currentUser?.is_bot_active === false ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${currentUser?.is_bot_active === false ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {currentUser?.is_bot_active === false ? 'Live Support Agent' : 'Active now'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <img src={adminAvatar} alt="Admin" className="w-12 h-12 object-contain opacity-50" />
                                </div>
                                <h3 className="text-gray-900 font-bold mb-2">Welcome to Support!</h3>
                                <p className="text-gray-500 text-sm max-w-[200px] mb-6">
                                    Ask us anything or choose a common question below to get started.
                                </p>
                            </div>
                        ) : (
                            messages.map(renderMsg)
                        )}
                        
                        {isAdminTyping && (
                            <div className="flex items-center gap-2 self-start mb-2 px-4">
                                <img src={adminAvatar} alt="Admin" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm">
                                    <SendingDots />
                                </div>
                            </div>
                        )}
                        
                        <div ref={desktopBottomRef} />
                    </div>
                    {inputArea()}
                </div>
            </div>

            {/* MOBILE */}
            <div className="lg:hidden pt-20 px-4 pb-8 min-h-screen bg-gray-50 flex flex-col">
                <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-3xl overflow-hidden border border-[#DCDCDC] shadow-sm">
                    <div className="flex items-center gap-3 p-4 border-b border-[#DCDCDC] bg-white">
                        <img src={adminContact.avatar} alt={adminContact.name} className="w-10 h-10 rounded-full object-contain" />
                        <div>
                            <span className="font-black text-gray-900">{adminContact.name}</span>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${currentUser?.is_bot_active === false ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${currentUser?.is_bot_active === false ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {currentUser?.is_bot_active === false ? 'Live Agent' : 'Active now'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <img src={adminAvatar} alt="Admin" className="w-12 h-12 object-contain opacity-50" />
                                </div>
                                <h3 className="text-gray-900 font-bold mb-2">Welcome to Support!</h3>
                                <p className="text-gray-500 text-sm max-w-[200px] mb-6">
                                    Ask us anything or choose a common question below to get started.
                                </p>
                            </div>
                        ) : (
                            messages.map(renderMsg)
                        )}

                        {isAdminTyping && (
                            <div className="flex items-center gap-2 self-start mb-2 px-4">
                                <img src={adminAvatar} alt="Admin" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm">
                                    <SendingDots />
                                </div>
                            </div>
                        )}

                        <div ref={mobileBottomRef} />
                    </div>
                    {inputArea(true)}
                </div>
            </div>
        </>
    );
};

export default CustomerInbox;