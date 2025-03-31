import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/Components/Footer/Footer";
import Navbar from "@/Components/Nav/Navbar";
import { ReactNode } from "react"
import LayoutWrapper from "@/Components/LayoutWrapper/LayoutWrapper"
export const metadata = {
  title: "Xpérience",
  description: "site échangiste. ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}
