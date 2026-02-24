import BillingHistory from '@/components/BillingHistory';
import { Suspense } from 'react';

export default function BillingHistoryPage() {
  return (
    <Suspense fallback={<div>Loading History...</div>}>
      <BillingHistory />
    </Suspense>
  );
}
