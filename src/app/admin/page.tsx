import React, { Suspense } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900">
      <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading Admin...</div>}>
        <AdminDashboard />
      </Suspense>
    </div>
  );
}
