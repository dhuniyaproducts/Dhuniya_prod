import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhuniya Products — Eastern Traditional Sweets",
  description: "Dhuniya Products - Authentic Eastern Traditional Sweets from Maruthamunai. Order premium halwas, toffees and traditional sweets.",
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
