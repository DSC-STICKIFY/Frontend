import React from "react";
import ArtistWorkflowMonitor from "../../components/ArtistWorkflowMonitor";

export default function CustomerServiceArtistInbox() {
    return (
        <div className="h-full flex flex-col p-10 bg-gray-50/50">
            <header className="mb-8">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 mb-1">Artist Inbox</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Monitor and participate in customer and artist design conversations</p>
            </header>
            
            <div className="flex-1 min-h-0">
                <ArtistWorkflowMonitor isReadOnly={true} isChatReadOnly={false} showAllOrders={true} />
            </div>
        </div>
    );
}
