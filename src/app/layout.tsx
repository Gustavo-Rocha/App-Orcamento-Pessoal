import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Antigravity Fin - Orçamento Pessoal",
    template: "%s | Antigravity Fin",
  },
  description: "Gerenciador financeiro pessoal moderno, seguro e inteligente",
  keywords: ["orçamento pessoal", "finanças", "controle de gastos", "gestão financeira"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
