"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Footer from "../Footer/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  // ✅ On cache le footer seulement quand une conversation est ouverte
  const conversationId = searchParams?.get("conversationId");
  const hideFooter = pathname === "/messagerie" && !!conversationId;

  if (hideFooter) return null;
  return <Footer />;
}
