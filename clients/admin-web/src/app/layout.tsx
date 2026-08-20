"use client";
import "./globals.css";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { AuthProvider } from "@/components/auth-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <HeroUIProvider>
          <ToastProvider placement="top-right" />
          <AuthProvider>{children}</AuthProvider>
        </HeroUIProvider>
      </body>
    </html>
  );
}
