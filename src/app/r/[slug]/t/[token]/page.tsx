import React, { Suspense } from 'react';
import { CustomerMenuPage } from '@/components/customer/CustomerMenuPage';

interface PageProps {
  params: Promise<{
    slug: string;
    token: string;
  }>;
}

export default async function TableOrderRoute({ params }: PageProps) {
  const { slug, token } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Connecting Table...</div>
        </div>
      }
    >
      <CustomerMenuPage slug={slug} tableToken={token} />
    </Suspense>
  );
}
