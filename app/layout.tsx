import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOOR / STUDIO - Objects for your orbit.",
  description: "Uncommon jewelry objects made in small runs.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}