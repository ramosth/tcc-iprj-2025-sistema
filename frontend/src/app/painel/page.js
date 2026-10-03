// ============= src/app/painel/page.js =============
// Painel único do administrador.
'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Painel from '@/components/painel/Painel';

export default function PainelPage() {
  return (
    <ProtectedRoute>
      <Painel />
    </ProtectedRoute>
  );
}
