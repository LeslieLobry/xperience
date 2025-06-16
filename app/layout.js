"use client";

import "../app/globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Allura, Raleway } from "next/font/google";
import ConditionalNavbar from "../components/ConditionalNavbar/ConditionalNavbar";
import Footer from "../components/Footer/Footer";
import ChatBubble from "../components/ChatBubble/ChatBubble";
import ClientWrapper from "../components/ClientWrapper/ClientWrapper";
import BandeauCookies from "../components/BandeauCookies/BandeauCookies";
import LoaderAnnonce from "../components/LoaderAnnonce/LoaderAnnonce";
import { usePathname } from "next/navigation";

const allura = Allura({ subsets: ["latin"], weight: "400" });
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-raleway",
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const estAccueil = pathname === "/";

  return (
    <html lang="fr" className={`${allura.variable} ${raleway.variable}`}>
      <body className="font-raleway">
        <AuthProvider>
          <ClientWrapper>
            {estAccueil && <LoaderAnnonce />}
            <ConditionalNavbar />
            {children}
            <ChatBubble />
            <Footer />
            <BandeauCookies />
          </ClientWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
