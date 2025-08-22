import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "D-Sports",
  description: "Sistema de gestión de béisbol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <AuthSessionProvider>
          <ThemeProvider defaultTheme="dark" storageKey="baseball-theme">
            <div className="relative flex min-h-screen flex-col">
              <main className="flex-1">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}