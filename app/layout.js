export const dynamic = "force-dynamic";
import { Geist, Geist_Mono, Crimson_Text, Allura, Raleway} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ReactNode } from "react"
import LayoutWrapper from "../components/LayoutWrapper/LayoutWrapper"
const allura = Allura({ subsets: ['latin'], weight: '400' });
const raleway = Raleway({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-raleway' });

export const metadata = {
  title: "Xpérience",
  description: "site échangiste. ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${allura.variable} ${raleway.variable}`}>
       <body className="font-raleway">
      <AuthProvider>
        <LayoutWrapper>{children}</LayoutWrapper>
      </AuthProvider>
      </body>
    </html>
  )
}
