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
}

const Modal = ({ isOpen, onClose, onAction, actionLabel, title, message, type = 'info' }: ModalProps) => {
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
                            className="w-full bg-[#5a4fcf] text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all hover:bg-[#4a3fb8]"
                        >
                            {actionLabel || 'Got it'}
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
