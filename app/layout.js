
import "../app/globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Allura, Raleway } from "next/font/google";
import ConditionalNavbar from "../components/ConditionalNavbar/ConditionalNavbar";
import Footer from "../components/Footer/Footer";
import ClientWrapper from "../components/ClientWrapper/ClientWrapper";
import BandeauCookies from "../components/BandeauCookies/BandeauCookies";
import { Analytics } from "@vercel/analytics/next"
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const allura = Allura({ subsets: ["latin"], weight: "400" });
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-raleway",
});
export const metadata = {
  title: "Xperiences",
  description: "Site échangiste, libertinage",
   icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${allura.variable} ${raleway.variable}`}>
      <body className="font-raleway">
        <AuthProvider>
          <ClientWrapper>
            <ConditionalNavbar />
            {children}
            {/* <ChatBubble /> */}
            <Footer />
            <BandeauCookies />
          </ClientWrapper>
        </AuthProvider>
        {/* Place-le ici : */}
        <ToastContainer
          position="top-right"   // ou "bottom-right"
          autoClose={4000}       // 4 secondes
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable
          theme="dark"           // Ou "light", ou personnalisable !
        />
        <Analytics />
      </body>
    </html>
  );
}

