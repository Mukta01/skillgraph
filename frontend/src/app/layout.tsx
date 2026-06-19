import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SkillGraph — Find Your Skill Gaps, Get a Roadmap",
  description:
    "Upload your resume, pick your dream role, and instantly see what skills you're missing with a personalized learning roadmap.",
  keywords: [
    "skill gap analysis",
    "career roadmap",
    "resume analyzer",
    "learning path",
    "job skills",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gradient-animated">
        {children}
      </body>
    </html>
  );
}
