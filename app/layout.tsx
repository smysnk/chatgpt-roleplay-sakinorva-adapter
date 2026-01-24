import type { Metadata } from "next";
import "./globals.css";
import AppMenuBar from "@/app/components/AppMenuBar";
import { startRunQueue } from "@/lib/runQueue";

startRunQueue();

export const metadata: Metadata = {
  title: "Sakinorva Character Adapter",
  description: "Run the Sakinorva cognitive functions test as a fictional or historical character."
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
