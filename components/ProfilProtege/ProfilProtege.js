"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function ProfilProtege({ userId, children }) {
  const { fetchUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [userId, router, fetchUser]); // ✅ Ajout de fetchUser maintenant qu’il est mémoïsé

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Chargement du profil sécurisé...
      </div>
    );
  }

  return children;
}
