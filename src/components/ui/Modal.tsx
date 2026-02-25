'use client';

import React from 'react';
import { Check, AlertTriangle, Info, Bell } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'info' | 'ask';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAction?: () => void;
    actionLabel?: string;
    title: string;
    message: string;
    type?: ModalType;
    isLoading?: boolean;
}

const Modal = ({ isOpen, onClose, onAction, actionLabel, title, message, type = 'info', isLoading = false }: ModalProps) => {
    if (!isOpen) return null;
    const Icon = type === 'success' ? Check : type === 'error' ? AlertTriangle : type === 'ask' ? Bell : Info;
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'ask' ? 'bg-[#5a4fcf]' : 'bg-blue-500';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-[320px] rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
                <div className="flex flex-col items-center text-center">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${bgColor} shadow-lg shadow-black/10`}>
                        <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 truncate w-full">{title}</h3>
                    <p className="text-sm text-gray-600 font-semibold leading-relaxed mb-1">{message}</p>

                    <div className="w-full flex flex-col gap-2.5 mt-6">
                        <button
                            onClick={onAction || onClose}
                            disabled={isLoading}
                            className="w-full bg-[#5a4fcf] flex items-center justify-center gap-2 text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all hover:bg-[#4a3fb8] disabled:opacity-70"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                actionLabel || 'Got it'
                            )}
                        </button>
                        {onAction && (
                            <button
                                onClick={onClose}
                                className="w-full bg-gray-50 text-gray-500 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all hover:bg-gray-100"
                            >
                                Not now
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
