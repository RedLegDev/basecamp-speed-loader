import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basecamp Speed Loader",
  description: "Quickly load project breakdowns into Basecamp 3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
