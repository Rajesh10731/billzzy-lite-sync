// src/app/(admin)/admin/dashboard/page.tsx

import AdminDashboard from '@/components/AdminDashboard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminDashboardPage() {
  await getServerSession(authOptions);

  return (
    <div style={{ padding: '2rem' }}>
      <AdminDashboard />
    </div>
  );
}