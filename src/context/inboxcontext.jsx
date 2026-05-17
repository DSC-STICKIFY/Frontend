import React, { createContext, useContext, useState, useCallback } from 'react';

const InboxContext = createContext(null);

export const InboxProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    const updateUnread = useCallback((count) => {
        setUnreadCount(count);
    }, []);

    return (
        <InboxContext.Provider value={{ unreadCount, updateUnread }}>
            {children}
        </InboxContext.Provider>
    );
};

export const useInbox = () => {
    const ctx = useContext(InboxContext);
    if (!ctx) throw new Error('useInbox must be used inside <InboxProvider>');
    return ctx;
};