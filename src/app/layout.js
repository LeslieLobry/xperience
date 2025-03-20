import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/Components/Footer/Footer";

export const metadata = {
  title: "Xpérience",
  description: "site échangiste. ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
         <body>
        {children} 
           <Footer/>
      </body>
    </html>
  );
}
