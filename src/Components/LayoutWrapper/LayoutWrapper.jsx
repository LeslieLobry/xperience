"use client"

import { usePathname } from "next/navigation"
import Navbar from "@/Components/Nav/Navbar"
import Footer from "../Footer/Footer"

export default function LayoutWrapper({ children }) {
  const pathname = usePathname()

  const showNavbar = pathname !== "/"

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
      <Footer/>
    </>
  )
}
