import type { Metadata } from "next";
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
  title: { default: "Construction Platform", template: "%s · Construction Platform" },
  description: "Projects, materials, labour and money for Pakistani building contractors.",
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
