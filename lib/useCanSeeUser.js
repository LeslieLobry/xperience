import { useEffect, useState } from "react";

export function useCanSeeUser(cibleId) {
  const [canSee, setCanSee] = useState(null); // null = en chargement

  useEffect(() => {
    const fetchCanSee = async () => {
      try {
        const res = await fetch(`/api/blocage/visibilite/${cibleId}`);
        const data = await res.json();
        setCanSee(data.canSee);
      } catch {
        setCanSee(false);
      }
    };

    fetchCanSee();
  }, [cibleId]);

  return canSee;
}
