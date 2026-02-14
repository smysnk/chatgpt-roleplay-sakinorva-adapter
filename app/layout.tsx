import type { Metadata } from "next";
import "./globals.css";
import AppMenuBar from "@/app/components/AppMenuBar";

export const metadata: Metadata = {
  title: "Jungian Cognitive Function Tests",
  description:
    "Take and compare Jungian cognitive function tests, review stack-based results, and share interpretable profile pages."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppMenuBar />
        {children}
      </body>
    </html>
  );
}
