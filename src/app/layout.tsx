import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { DemoSwitcher } from '@/components/common/DemoSwitcher';

export const metadata: Metadata = {
  title: 'QR Dine - Multi-Restaurant Ordering SaaS',
  description: 'Mobile-first QR ordering web app for dine-in restaurants.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QR Dine',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ea580c',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Suspense fallback={null}>
            <DemoSwitcher />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
