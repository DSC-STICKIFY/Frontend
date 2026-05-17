import React, { useState, useRef, useEffect } from "react";
import searchB from "../../assets/search.svg";
import customerlll from "../../assets/customerlll.png";
import links from "../../assets/links.svg";
import send from "../../assets/send.svg";
import emojis from "../../assets/emojis.svg";

// Chat contact component
const ChatContact = ({ name, lastMessage, time, unread, avatar, onClick, isSelected }) => (
    <div
        onClick={onClick}
        className={`flex items-center justify-between p-4 cursor-pointer transition border-b border-gray-50 last:border-0 ${isSelected ? "bg-[#FDE31E]/10" : "hover:bg-gray-50"
            }`}
    >
        <div className="flex items-center space-x-3">
            <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-900">{name}</span>
                <span className="text-xs text-gray-500 truncate max-w-[180px]">{lastMessage}</span>
            </div>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400">{time}</span>
            {unread > 0 && (
                <div className="bg-[#FDE31E] shadow-sm text-black text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center mt-1 border border-[#DCDCDC]">
                    {unread}
                </div>
            )}
        </div>
    </div>
);

const sampleEmojis = ["😀", "😂", "😍", "😎", "👍", "🙏", "💖", "🥳"];

const CustomerServiceInbox = () => {
    const [contacts, setContacts] = useState([
        {
            name: "Charlie Orence",
            lastMessage: "Hey, how are you?",
            time: "10:45 AM",
            unread: 2,
            avatar: customerlll,
            isActive: true,
        },
        {
            name: "Carl Lomotos",
            lastMessage: "See you tomorrow!",
            time: "Yesterday",
            unread: 0,
            avatar: customerlll,
            isActive: false,
        },
    ]);

    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

    const emojiPickerRef = useRef(null);
    const fileInputRef = useRef(null);
    const bottomRef = useRef(null);

    const scrollToBottom = (behavior = "smooth") => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior, block: "end" });
        }
    };

    useEffect(() => {
        // Instant scroll for initial load
        scrollToBottom("auto");
        // Delayed scroll for any late-rendering content
        const timer = setTimeout(() => scrollToBottom("smooth"), 100);
        return () => clearTimeout(timer);
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setEmojiPickerVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSend = () => {
        if (!message.trim() || !selectedContact) return;

        const newMessage = {
            senderId: 0, // current user
            receiverId: selectedContact.name,
            content: message,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMessage]);

        // Update lastMessage and time in contacts
        setContacts((prevContacts) =>
            prevContacts.map((c) =>
                c.name === selectedContact.name
                    ? {
                        ...c,
                        lastMessage: message,
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    }
                    : c
            )
        );

        setMessage("");
    };

    const handleEmojiClick = (emoji) => {
        setMessage((prev) => prev + emoji);
        setEmojiPickerVisible(false);
    };

    const handleFileClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        console.log("Selected files:", e.target.files);
    };

    return (
        <div className="p-8 bg-white rounded-[40px] border border-[#DCDCDC] shadow-sm my-5 mr-5 ml-1 h-[calc(100vh-2.5rem)] flex">
            <div className="flex gap-2 w-full h-full">

                <div className="flex flex-col h-full w-[320px]">
                    <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Message Center</h1>

                    <div className="flex items-center bg-gray-50 border border-[#DCDCDC] rounded-2xl h-12 px-4 mb-4 flex-shrink-0 focus-within:ring-4 focus-within:ring-[#FDE31E]/10 transition-all">
                        <img src={searchB} alt="search" className="w-4 h-4 opacity-40" />
                        <input
                            type="text"
                            className="flex-grow bg-transparent border-none outline-none text-gray-700 text-sm pl-3 font-medium"
                            placeholder="Search conversations..."
                        />
                    </div>

                    <div className="bg-white border border-[#DCDCDC] rounded-3xl flex-1 overflow-y-auto shadow-sm">
                        {contacts.map((contact, index) => (
                            <ChatContact
                                key={index}
                                {...contact}
                                onClick={() => {
                                    setSelectedContact(contact);
                                    setMessages([]);
                                }}
                                isSelected={selectedContact?.name === contact.name}
                            />
                        ))}
                    </div>
                </div>


                <div className="flex-1 bg-white border border-[#DCDCDC] rounded-[32px] flex flex-col ml-6 shadow-sm overflow-hidden">
                    {selectedContact ? (
                        <>

                            {/* Header */}
                            <div className="flex items-center gap-4 p-6 border-b border-gray-50 flex-shrink-0 bg-gray-50/30">
                                <img src={selectedContact.avatar} alt={selectedContact.name} className="w-10 h-10 rounded-full object-cover" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 text-sm">{selectedContact.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${selectedContact.isActive ? "bg-green-500" : "bg-gray-300"}`}></div>
                                        <span className="text-[10px] text-gray-500 uppercase font-semibold">
                                            {selectedContact.isActive ? "Online" : "Offline"}
                                        </span>
                                    </div>
                                </div>
                            </div>


                            <div className="flex-1 flex flex-col p-4 overflow-y-auto gap-2">
                                {messages.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-gray-400">Start Conversation</div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-end gap-2 w-full ${msg.senderId === 0 ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`flex items-end gap-2 ${msg.senderId === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`max-w-[95%] px-5 py-4 rounded-3xl break-words text-[14px] font-medium transition-all shadow-sm ${msg.senderId === 0
                                                        ? "bg-[#FDE31E] text-black rounded-br-none"
                                                        : "bg-white text-gray-900 rounded-bl-none border border-[#DCDCDC]"
                                                    }`}
                                                >
                                                    <p className="leading-relaxed">{msg.content}</p>
                                                    <div className={`text-[10px] mt-1 font-bold text-right uppercase ${msg.senderId === 0 ? 'text-yellow-900/60' : 'text-gray-400'
                                                        }`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input Area */}
                            <div className="flex items-center border-t border-[#DCDCDC] gap-3 p-4 flex-shrink-0 relative bg-white">

                                <button className="opacity-30 hover:opacity-100 transition-opacity" onClick={handleFileClick}>
                                    <img src={links} alt="Upload" className="h-5" />
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple />
                                </button>

                                <div className="flex-1 border border-[#DCDCDC] rounded-3xl px-5 py-3 focus-within:ring-2 focus-within:ring-yellow-400 bg-gray-50/50 transition-all">
                                    <input
                                        type="text"
                                        placeholder="Communicate with customer..."
                                        className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-gray-400"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    />
                                </div>

                                <div className="relative">
                                    <button
                                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                        onClick={() => setEmojiPickerVisible((prev) => !prev)}
                                    >
                                        <img src={emojis} alt="emoji" className="h-4 opacity-40" />
                                    </button>

                                    {emojiPickerVisible && (
                                        <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-3 bg-white p-4 rounded-3xl shadow-2xl border border-[#DCDCDC] flex gap-2 flex-wrap w-[260px] z-50">
                                            {sampleEmojis.map((emoji, i) => (
                                                <button key={i} onClick={() => handleEmojiClick(emoji)} className="text-2xl hover:bg-gray-50 p-2.5 rounded-3xl transition-transform active:scale-125">
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button
                                    className="h-12 w-12 rounded-3xl flex items-center justify-center bg-[#FDE31E] hover:bg-yellow-400 transition-all active:scale-90 shadow-md "
                                    onClick={handleSend}
                                >
                                    <img src={send} alt="send" className="h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Select a conversation to start messaging
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerServiceInbox;
