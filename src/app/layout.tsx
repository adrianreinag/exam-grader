"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/infrastructure/auth/AuthProvider";
import { ApiProvider } from "@/infrastructure/api/ApiProvider";
import { Toaster } from "@/components/ui/sonner";
import { Suspense, ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-background text-foreground antialiased">
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Cargando...</div>}>
          <ApiProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ApiProvider>
        </Suspense>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}