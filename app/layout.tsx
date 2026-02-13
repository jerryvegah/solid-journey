import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: "Agricheck – Climate Smart Farming Starts Here",
  description: "Remotely map your farm and access tailored input packages.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body className={`${poppins.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}