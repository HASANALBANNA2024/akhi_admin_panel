'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Every page inside (admin) needs a valid token, otherwise we go to /login. */
export default function AdminLayout({ children }) {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => { if (session === null) router.replace('/login'); }, [session, router]);

  if (!session) return <Loading />;
  return <Shell>{children}</Shell>;
}
