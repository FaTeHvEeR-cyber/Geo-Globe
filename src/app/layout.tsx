import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Earth Explorer - 3D Globe Visualization",
  description: "Browser-based 3D Earth visualization with CesiumJS, featuring street-level imagery, real-time weather data, and multiple map layers.",
  keywords: ["Earth", "3D Globe", "CesiumJS", "WebGL", "Maps", "Geospatial", "Weather", "Street View"],
  authors: [{ name: "Earth Explorer Team" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'/><path d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'/><path d='M2 12h20'/></svg>",
  },
  openGraph: {
    title: "Earth Explorer - 3D Globe",
    description: "Interactive 3D Earth visualization with weather and street view",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Earth Explorer - 3D Globe",
    description: "Interactive 3D Earth visualization with weather and street view",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
