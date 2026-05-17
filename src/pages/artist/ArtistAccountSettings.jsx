import React from "react";
import CustomerAccountSettings from "../customer/CustomerAccountSettings";

export default function ArtistAccountSettings() {
    // We can reuse the CustomerAccountSettings since the profile update logic 
    // in the backend is now role-agnostic thanks to our AuthenticationServices update.
    return (
        <div className="p-10">
             <header className="mb-10">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">Account Settings</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Manage your professional profile</p>
            </header>
            
            <div className="max-w-4xl">
                <CustomerAccountSettings />
            </div>
        </div>
    );
}
