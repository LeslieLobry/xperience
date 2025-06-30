import { redirect } from "next/navigation";
import { getUserFromToken } from "../../../lib/auth";
import AdminEvenementsClient from "./AdminEvenementsClient";

export default async function AdminEvenementsPage() {
  const user = await getUserFromToken();

  if (!user || user.role !== "ADMIN") {
    redirect("/accueil-page"); // ou /evenements si tu préfères
  }

  return <AdminEvenementsClient />;
}
