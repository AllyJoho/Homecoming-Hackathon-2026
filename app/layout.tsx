import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_DESC } from "@/lib/appConfig";

// The body/UI face (Helvetica) is a system font, not loaded here. See
// --font-sans in globals.css for the fallback stack.

// Code in quiz questions. Chosen for unambiguous 0/O and 1/l/I — the quizzes
// ask people to read code closely enough to spot a bug.
const appMono = JetBrains_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
});

// Display serif, used only on the certificate (`font-display`) so it reads as
// a credential. Not wired to `font-serif`, which the resume document uses.
const appDisplay = Fraunces({
  variable: "--font-app-display",
  subsets: ["latin"],
});

// `title.template` means a page can export `title: 'Career'` and get
// "Career · SkillStack" in the tab without repeating the suffix.
// The tab icon is the app/icon.svg file convention — Next emits the <link> for
// it, so there's nothing to declare here.
export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESC,
  applicationName: APP_NAME,
  openGraph: { title: APP_NAME, description: APP_DESC, type: "website" },
};

// Paints the browser's own chrome (mobile address bar) to match the page
// surface, so the app doesn't sit under a white bar in dark mode. The two
// colors are the --background token from globals.css.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${appMono.variable} ${appDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
