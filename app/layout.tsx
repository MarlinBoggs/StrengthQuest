import type { Metadata, Viewport } from "next";
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

const siteDescription =
  "The workout tracker that turns your lifts into RPG skills. Earn XP every set, level up Push, Pull, and Legs, and climb the tier ladder from Stone to Mythic.";

export const metadata: Metadata = {
  // TODO: replace with the real production domain
  metadataBase: new URL("https://strengthquest.app"),
  title: {
    default: "StrengthQuest — Level up your strength IRL",
    template: "%s · StrengthQuest",
  },
  description: siteDescription,
  openGraph: {
    title: "StrengthQuest — Level up your strength IRL",
    description: siteDescription,
    url: "/",
    siteName: "StrengthQuest",
    type: "website",
    images: [
      {
        // Placeholder — add a 1200×630 image at public/og-image.png
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StrengthQuest — Level up your strength IRL",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrengthQuest — Level up your strength IRL",
    description: siteDescription,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#06060b",
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
