import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./AuthContext";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mock Test Hub - India's #1 Govt Exam Prep Site",
  description: "Get mock tests, notice updates, and access passes for SSC, Railways, UGC NET, Teaching, and State Exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200">
        <AuthProvider>
          {children}
        </AuthProvider>

        {/* Load MathJax configuration and library script for LaTeX support */}
        <Script id="mathjax-config" strategy="afterInteractive">
          {`
            window.MathJax = {
              tex: {
                inlineMath: [['\\\\(', '\\\\)'], ['$', '$']],
                displayMath: [['\\\\[', '\\\\]'], ['$$', '$$']],
                processEscapes: true
              }
            };
          `}
        </Script>
        <Script
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
