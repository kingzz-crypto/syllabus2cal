import type { Metadata } from "next";
import "./globals.css";

// Full SEO/OG metadata is Step 17; this is just enough to be presentable.
export const metadata: Metadata = {
  title: "Syllabus2Cal",
  description:
    "Upload a syllabus PDF, get every deadline as a calendar file. Never miss a deadline.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
