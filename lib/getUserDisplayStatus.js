export function isUserVisible(user) {
  return user?.statut === "en_ligne";
}

export function getUserDisplayStatus(user, isOnlineNow) {
  const visible = isUserVisible(user);

  if (!visible) {
    return "hors_ligne";
  }

  return isOnlineNow ? "en_ligne" : "hors_ligne";
}