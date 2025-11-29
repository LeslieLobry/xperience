import "../app/globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Allura, Raleway } from "next/font/google";
import ConditionalNavbar from "../components/ConditionalNavbar/ConditionalNavbar";
import Footer from "../components/Footer/Footer";
import ClientWrapper from "../components/ClientWrapper/ClientWrapper";
import { Analytics } from "@vercel/analytics/next";
import { ToastContainer } from "react-toastify";
import Script from "next/script";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import InstallAppBanner from "../components/InstallAppBanner/InstallAppBanner"; // ✅ import direct

// 🔹 Ces composants sont chargés côté client uniquement (lazy)
const BandeauCookies = dynamic(
  () => import("../components/BandeauCookies/BandeauCookies"),
  { ssr: false }
);

const HeartbeatClient = dynamic(
  () => import("../components/HeartbeatClient/HeartbeatClient"),
  { ssr: false }
);

// 🔹 Fonts
const allura = Allura({ subsets: ["latin"], weight: "400" });
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-raleway",
});

// 🔹 SEO / favicon / PWA
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

            {/* 🔁 Heartbeat → client-only */}
            <HeartbeatClient intervalMs={60_000} />

            {children}

            <Footer />

            {/* 🍪 Bandeau cookies → client-only */}
            <BandeauCookies />
          </ClientWrapper>
        </AuthProvider>

        {/* 📲 Bannière "Télécharger l’app" */}
        <InstallAppBanner />

        {/* 🔔 Notifications toast */}
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable
          theme="dark"
        />

        {/* 📊 Analytics Vercel */}
        <Analytics />

        {/* 📈 Script Metricool (en bas du body) */}
        <Script id="metricool" strategy="afterInteractive">
          {`
            function loadScript(a){
              var b=document.getElementsByTagName("head")[0],
                  c=document.createElement("script");
              c.type="text/javascript";
              c.src="https://tracker.metricool.com/resources/be.js";
              c.onreadystatechange=a;
              c.onload=a;
              b.appendChild(c);
            }
            loadScript(function(){
              beTracker.t({hash:"615ebc6689a321638b55a16d8966e190"});
            });
          `}
        </Script>
      </body>
    </html>
  );
}
