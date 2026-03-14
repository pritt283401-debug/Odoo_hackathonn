'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('ci_token');
    if (!token) router.replace('/login');
  }, [router]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="page-content">{children}</main>
    </div>
  );
}
