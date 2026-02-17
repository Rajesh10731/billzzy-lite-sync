// src/app/(admin)/admin/dashboard/page.tsx

import AdminDashboard from '@/components/AdminDashboard';
import AdminNotificationForm from '@/components/AdminNotificationForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminDashboardPage() {
  await getServerSession(authOptions);

  return (
    <div style={{ padding: '2rem' }}>
      <AdminDashboard />

      {/* 2. Admin Notification Tool */}
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">System Broadcast</h2>
        <p className="text-gray-600 mb-6">Send a push notification to all onboarded merchants.</p>
        <AdminNotificationForm />
      </div>
    </div>
  );
}