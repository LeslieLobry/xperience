"use client";

import { usePathname } from "next/navigation";
import Navbar from "../Nav/Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  return pathname !== "/" ? <Navbar /> : null;
}
