'use client';

import React, { useState } from 'react';
import AdminNotificationForm from '@/components/AdminNotificationForm';
import { Send, X } from 'lucide-react';

export default function BroadcastToggle() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
                <Send size={16} />
                <span>System Broadcast</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        role="presentation"
                        className="bg-transparent w-full max-w-2xl relative animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute -top-12 right-0 md:-right-12 z-10 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-md"
                        >
                            <X size={24} />
                        </button>
                        
                        <div className="max-h-[85vh] overflow-y-auto rounded-3xl" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <div className="pb-2">
                                <AdminNotificationForm />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
