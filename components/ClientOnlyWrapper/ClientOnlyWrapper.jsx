// components/ClientOnlyWrapper.js
"use client";

import dynamic from "next/dynamic";

const ConditionalNavbar = dynamic(() => import("../ConditionalNavbar/ConditionalNavbar"), {
  ssr: false,
});
const Footer = dynamic(() => import("../Footer/Footer"), { ssr: false });
const BandeauCookies = dynamic(() => import("../BandeauCookies/BandeauCookies"), { ssr: false });

export default function ClientOnlyWrapper({ children }) {
  return (
    <>
      <ConditionalNavbar />
      {children}
      <Footer />
      <BandeauCookies />
    </>
  );
}
