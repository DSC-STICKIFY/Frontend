import React from 'react';
import { X, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

const ModalConfirmAction = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Confirm Action", 
    message = "Are you sure you want to proceed?", 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    type = 'warning' // 'warning', 'success', 'danger', 'info'
}) => {
    if (!isOpen) return null;

    const config = {
        warning: {
            icon: <HelpCircle className="w-8 h-8 text-amber-500" />,
            btn: "bg-amber-500 hover:bg-amber-600 shadow-amber-100",
            bg: "bg-amber-50"
        },
        danger: {
            icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
            btn: "bg-red-500 hover:bg-red-600 shadow-red-100",
            bg: "bg-red-50"
        },
        success: {
            icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
            btn: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100",
            bg: "bg-emerald-50"
        }
    }[type] || {
        icon: <HelpCircle className="w-8 h-8 text-gray-500" />,
        btn: "bg-gray-900 hover:bg-black shadow-gray-200",
        bg: "bg-gray-50"
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in">
                <div className="p-8 text-center">
                    <div className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        {config.icon}
                    </div>
                    
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed px-4">
                        {message}
                    </p>
                </div>

                <div className="p-6 bg-gray-50 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-gray-900 hover:border-gray-300 transition-all"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg ${config.btn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalConfirmAction;
