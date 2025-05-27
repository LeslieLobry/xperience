"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function ProfilProtege({ userId, children }) {
  const { user, fetchUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const fetchedUser = await fetchUser();
      if (!fetchedUser) {
        router.replace("/connexion");
      } else if (parseInt(fetchedUser.id) !== parseInt(userId)) {
        router.replace(`/profil/${fetchedUser.id}`);
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [userId, fetchUser, router]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Chargement du profil sécurisé...
      </div>
    );
  }

  return children;
}
