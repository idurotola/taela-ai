import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaelaAI — AI-Powered Job Search Platform',
  description: 'Automate job applications, optimise your CV, and land your next role faster with TaelaAI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
