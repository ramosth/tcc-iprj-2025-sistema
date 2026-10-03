// ============= src/app/layout.js =============
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';

export const metadata = {
  title: 'Monitoramento de Barragem',
  description: 'Sistema de alerta para barragem de rejeitos: saturação do solo e chuva de 72 h.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
        </AuthProvider>
      </body>
    </html>
  );
}
