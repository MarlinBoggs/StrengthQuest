import type { Metadata } from "next";
import { Barlow, Cinzel } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "StrengthQuest",
  description: "Forge your legend. Track your strength.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Prevent theme flash: set data-theme before first paint */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sq-theme');if(t==='dark-rpg')document.documentElement.setAttribute('data-theme','dark-rpg');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${barlow.variable} ${cinzel.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
