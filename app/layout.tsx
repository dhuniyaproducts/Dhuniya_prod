import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhuniya Products — Eastern Traditional Sweets",
  description: "Dhuniya Products - Authentic Eastern Traditional Sweets from Maruthamunai. Order premium halwas, toffees and traditional sweets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
