import type { Metadata, Viewport } from "next";
import { Saira_Stencil_One, Archivo } from "next/font/google";
import "./globals.css";
import { STR } from "@/lib/strings";
import RegisterSW from "@/components/RegisterSW";

const stencil = Saira_Stencil_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-stencil",
});

const body = Archivo({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: STR.appName,
  description: "Pending orders board",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: STR.appName,
  },
  icons: {
    icon: "/icons/favicon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ece0c3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${stencil.variable} ${body.variable} antialiased`}>
        <div className="mx-auto min-h-dvh w-full max-w-120">{children}</div>
        <RegisterSW />
      </body>
    </html>
  );
}
