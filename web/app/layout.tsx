import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./AuthContext";
import DeploymentRecovery from "./components/DeploymentRecovery";
import { cookies } from "next/headers";

import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Mock Test Hub - India's #1 Govt Exam Prep Site",
  description: "Get mock tests, notice updates, and access passes for SSC, Railways, UGC NET, Teaching, and State Exams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const userProfile = cookieStore.get("tb_user_profile")?.value || null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="h-full min-h-full overflow-x-hidden flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200"
      >
        {/* MathJax config MUST load before the MathJax library. */}
        <Script src="/mathjax-config.js" strategy="beforeInteractive" />
        {/* MathJax CDN */}
        <Script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" strategy="beforeInteractive" />

        <AuthProvider initialUserProfile={userProfile}>
          <DeploymentRecovery />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
