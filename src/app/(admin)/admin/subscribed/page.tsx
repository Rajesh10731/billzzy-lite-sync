// src/app/(admin)/admin/subscribed/page.tsx
import AdminSubscribedUsers from '@/components/AdminSubscribedUsers';
import BroadcastToggle from '@/components/BroadcastToggle';
import Link from 'next/link';

export default function SubscribedUsersPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header & Back Button */}
                <div className="mb-8">
                    <Link
                        href="/admin/dashboard"
                        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-4 transition-colors"
                    >
                        <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notification Subscriptions</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Broadcast messages and manage merchants who have enabled push notifications.
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* 1. Broadcast Tool Toggle */}
                    <BroadcastToggle />

                    {/* 2. Subscribed Users List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <AdminSubscribedUsers />
                    </div>
                </div>
            </div>
        </div>
    );
}
