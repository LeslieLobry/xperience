"use client";
import { useRouter } from "next/navigation";
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";

export default function RechercheWrapper() {
  const router = useRouter();

  const handleSearch = (form) => {
    const query = new URLSearchParams();

    Object.entries(form).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => query.append(key, v));
      } else if (value) {
        query.append(key, value);
      }
    });

    router.push("/recherche?" + query.toString());
  };

  return <RechercheSidebar onSearch={handleSearch} />;
}
 