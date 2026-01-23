import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "DTC Multichain Bridge",
  description: "DTC Multichain Bridge UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black antialiased dark:bg-[#070B12] dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
