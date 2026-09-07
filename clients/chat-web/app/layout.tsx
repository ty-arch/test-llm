import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Web",
  description: "LLM chat web client",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
