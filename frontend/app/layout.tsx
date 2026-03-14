import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CoreInventory – Inventory Management System',
  description: 'Modern, real-time inventory management for your business',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
