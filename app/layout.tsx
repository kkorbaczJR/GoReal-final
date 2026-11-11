import type { Metadata, Viewport } from "next";
import { Geist_Mono, Newsreader } from "next/font/google";
import AccentTheme, { accentScript } from "@/components/AccentTheme";
import AccountSync from "@/components/AccountSync";
import AndroidBack from "@/components/AndroidBack";
import PwaHost from "@/components/PwaHost";
import { BASE_PATH } from "@/lib/base";
import { installScript } from "@/lib/install-script";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GoReal",
  description: "Take real breaks from your phone, grow your streak, dress up Rilo.",
  icons: { apple: `${BASE_PATH}/icons/apple-touch-icon.png` },
  appleWebApp: {
    capable: true,
    title: "GoReal",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
        <script dangerouslySetInnerHTML={{ __html: installScript }} />
      </head>
      <body>
        <div className="app-shell">{children}</div>
        <AndroidBack />
        <AccentTheme />
        <AccountSync />
        <PwaHost />
      </body>
    </html>
  );
}
