import BroadcastForm from "../../../components/admin/BroadcastForm";
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../../lib/auth";
export default async function EmailPage() {
  const user = await getUserFromToken();

  if (!user || user.role !== "ADMIN") {
    redirect("/accueil-page"); // ou /evenements si tu préfères
  }

  return <BroadcastForm/>;
}
