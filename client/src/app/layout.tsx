import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

// Runs before the page paints, so a saved dark/light choice never flashes the wrong theme
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("vh-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

// Google Sans (self-hosted in public/fonts). Variable font covers weights 400–700 and includes Thai glyphs.
const googleSans = localFont({
  variable: "--font-google-sans",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/GoogleSans-VariableFont_GRAD,opsz,wght.woff2",
      style: "normal",
      weight: "400 700",
    },
    {
      path: "../../public/fonts/GoogleSans-Italic-VariableFont_GRAD,opsz,wght.woff2",
      style: "italic",
      weight: "400 700",
    },
  ],
});

export const metadata: Metadata = {
  title: "ภาวนาสติ · Bhavana",
  description: "ระบบสื่อการเรียนรู้ออนไลน์เพื่อการศึกษาและปฏิบัติธรรม สติปัฏฐาน ๔",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={googleSans.variable} suppressHydrationWarning>
      <body>
        {/* beforeInteractive: Next injects this into the HTML before React hydrates, so it runs once */}
        <Script id="vh-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
