import "../app/globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Allura, Raleway } from "next/font/google";
import ConditionalNavbar from "../components/ConditionalNavbar/ConditionalNavbar";
import Footer from "../components/Footer/Footer"
import ChatBubble from "../components/ChatBubble/ChatBubble"


const allura = Allura({ subsets: ["latin"], weight: "400" });
const raleway = Raleway({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-raleway" });

export const metadata = {
  title: "Xpérience",
  description: "site échangiste.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${allura.variable} ${raleway.variable}`}>
      <body className="font-raleway">
        <AuthProvider>
          <ConditionalNavbar />
          {children}
          {/* La bulle de conversation apparaît partout */}
          <ChatBubble />
          <Footer/>
        </AuthProvider>
      </body>
    </html>
  );
}

