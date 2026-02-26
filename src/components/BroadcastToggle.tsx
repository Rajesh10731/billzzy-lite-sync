'use client';

import React, { useState } from 'react';
import AdminNotificationForm from '@/components/AdminNotificationForm';

export default function BroadcastToggle() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div
                className="p-6 md:p-8 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">System Broadcast</h2>
                    <p className="text-sm text-gray-600">Click to {isOpen ? 'close' : 'open'} the broadcast messaging tool.</p>
                </div>
                <div className="flex-shrink-0 ml-4">
                    <button
                        className={`p-2 rounded-full ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'} transition-colors duration-200`}
                        aria-label={isOpen ? "Close broadcast tool" : "Open broadcast tool"}
                    >
                        <svg
                            className={`w-6 h-6 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div
                className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
            >
                <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-600 mb-6">Send an instant push notification to all merchants who have subscribed.</p>
                    <div className="max-w-2xl">
                        <AdminNotificationForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
