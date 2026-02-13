import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
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
        <script src="https://checkout.flutterwave.com/v3.js" async></script>
      </head>
      <body className={`${poppins.variable} font-sans`}>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-9097WN5K03"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-9097WN5K03');
          `,
        }} />
        {children}
      </body>
    </html>
  );
}