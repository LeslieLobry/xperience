import { Geist, Geist_Mono, Crimson_Text, Allura} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ReactNode } from "react"
import LayoutWrapper from "../components/LayoutWrapper/LayoutWrapper"
export const metadata = {
  title: "Xpérience",
  description: "site échangiste. ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
      <AuthProvider>
        <LayoutWrapper>{children}</LayoutWrapper>
      </AuthProvider>
      </body>
    </html>
  )
}
