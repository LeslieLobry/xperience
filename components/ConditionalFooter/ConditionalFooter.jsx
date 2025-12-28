"use client";

import { usePathname } from "next/navigation";
import Footer from "../Footer/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname() || "";

  if (pathname === "/messagerie") return null;
  return <Footer />;
}
