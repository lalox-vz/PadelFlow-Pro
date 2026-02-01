import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { GodModeFab } from "@/components/super-admin/GodModeFab";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PadelFlow | Reserva tu Cancha",
    template: "%s | PadelFlow"
  },
  description: "La plataforma líder en gestión de clubes y reservas de Padel en Venezuela. Únete a la comunidad de PadelFlow.",
  keywords: ["Padel", "Reservas", "Venezuela", "Clubes", "Torneos", "Clases", "PadelFlow", "Deporte"],
  openGraph: {
    title: "PadelFlow | Reserva tu Cancha",
    description: "Gestiona tu club o reserva tu próxima partida en segundos. La red de Padel más grande de Venezuela.",
    url: "https://padelflow.app",
    siteName: "PadelFlow",
    images: [
      {
        url: "/logo.svg", // We will need to ensure this logo is neutral or updated
        width: 1200,
        height: 630,
        alt: "PadelFlow Logo",
      },
    ],
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PadelFlow",
    description: "Tu partido empieza aquí. Reserva, juega y compite.",
    images: ["/logo.svg"],
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem={false}
                disableTransitionOnChange
              >
                {children}
                <GodModeFab />
                <Toaster />
              </ThemeProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
