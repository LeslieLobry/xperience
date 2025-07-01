"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function ProfilProtege({ userId, children }) {
  const { fetchUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      window.scrollTo(0, 0);
    let isMounted = true;

    const checkUser = async () => {
      const fetchedUser = await fetchUser();

      if (!isMounted) return;

      if (!fetchedUser) {
        router.replace("/connexion");
        return;
      }

      if (parseInt(fetchedUser.id) !== parseInt(userId)) {
        router.replace(`/profil/${fetchedUser.id}`);
        return;
      }

      setLoading(false);
    };

    checkUser();

    return () => {
      isMounted = false;
    };
  }, [userId, router, fetchUser]); 

  if (loading) {
    return (
      null
    );
  }

  return children;
}
