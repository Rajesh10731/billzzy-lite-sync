'use client';

import React, { useEffect, useState } from 'react';
import { Bell, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface INotification {
    _id: string;
    title: string;
    message: string;
    url?: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications/history');
            if (res.ok) {
                const data = await res.ok ? await res.json() : [];
                setNotifications(data);
            }
        } catch {
            console.error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch('/api/notifications/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id }),
            });
            if (res.ok) {
                if (id === 'all') {
                    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                } else {
                    setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
                }
            }
        } catch {
            console.error('Failed to mark as read');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Mobile Sticky Header */}
            <header className="sticky top-0 z-50 bg-white border-b px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
                </div>

                {notifications.some(n => !n.isRead) && (
                    <button
                        onClick={() => markAsRead('all')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all"
                    >
                        Mark all Read
                    </button>
                )}
            </header>

            <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 pointer-events-none">
                        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                        <p className="text-gray-500 font-medium">Loading your alerts...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                            <Bell className="h-10 w-10 text-indigo-200" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No notifications yet</h2>
                        <p className="text-gray-500 max-w-xs mx-auto">
                            When you receive updates about sales or stock, they&apos;ll show up here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notif) => (
                            <div
                                key={notif._id}
                                onClick={() => !notif.isRead && markAsRead(notif._id)}
                                className={`group relative bg-white border rounded-2xl p-4 transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.99] ${notif.isRead ? 'opacity-80' : 'ring-1 ring-indigo-50 shadow-sm border-indigo-100'
                                    }`}
                            >
                                {!notif.isRead && (
                                    <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-600 rounded-full" />
                                )}

                                <div className="flex gap-4">
                                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${notif.isRead ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                        <MessageSquare size={24} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-bold truncate ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                                {notif.title}
                                            </h3>
                                        </div>
                                        <p className={`text-sm leading-relaxed mb-3 ${notif.isRead ? 'text-gray-500' : 'text-gray-600 font-medium'}`}>
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">
                                                {new Date(notif.createdAt).toLocaleDateString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            {notif.url && (
                                                <Link
                                                    href={notif.url}
                                                    className="text-xs font-bold text-indigo-600 hover:indigo-700 flex items-center gap-1"
                                                >
                                                    View Details
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <p className="text-center py-10 text-xs text-gray-400 font-medium uppercase tracking-wider">
                            End of notifications
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
