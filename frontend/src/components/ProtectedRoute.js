// ============= src/components/ProtectedRoute.js =============
// Só mostra o conteúdo se o administrador estiver logado; senão, vai para /login.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !admin) router.replace('/login');
  }, [admin, carregando, router]);

  if (carregando || !admin) {
    return <div className="carregando-pagina">Carregando…</div>;
  }
  return children;
}
