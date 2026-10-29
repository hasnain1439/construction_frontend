import type { Metadata, Viewport } from "next";
import { Cabin, Noto_Nastaliq_Urdu } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/store/StoreProvider";
import "./globals.css";

// Urdu script (Nastaliq) — used only when the Urdu language is chosen.
const urdu = Noto_Nastaliq_Urdu({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});

const cabin = Cabin({
  variable: "--font-cabin",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute URLs for the OpenGraph image (SITE_URL in production; localhost while developing).
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  applicationName: "Keystone",
  title: { default: "Keystone", template: "%s · Keystone" },
  description:
    "Build on solid numbers — projects, materials, labour and money for Pakistani building contractors.",
  openGraph: {
    siteName: "Keystone",
    title: "Keystone",
    description: "Build on solid numbers",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4F2" },
    { media: "(prefers-color-scheme: dark)", color: "#201F1E" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cabin.variable} ${urdu.variable} h-full`} suppressHydrationWarning>
      {/* Browser extensions (Grammarly, ColorZilla …) add attributes to <body> before React loads. */}
      <body className="min-h-full bg-background text-sm text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <StoreProvider>
            <TooltipProvider delayDuration={300}>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </TooltipProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
