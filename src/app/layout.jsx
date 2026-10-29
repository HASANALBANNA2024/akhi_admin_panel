import './globals.css';
import Providers from '@/components/Providers';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'Akhi Lifestyle — Admin',
  description: 'Admin panel for Akhi Lifestyle online shop',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
