// src/app/(admin)/admin/subscribed/page.tsx
import AdminSubscribedUsers from '@/components/AdminSubscribedUsers';
import BroadcastToggle from '@/components/BroadcastToggle';

export default function SubscribedUsersPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notification Subscriptions</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Broadcast messages and manage merchants who have enabled push notifications.
                        </p>
                    </div>
                    <BroadcastToggle />
                </div>

                <div className="space-y-8">


                    {/* 2. Subscribed Users List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <AdminSubscribedUsers />
                    </div>
                </div>
            </div>
        </div>
    );
}
