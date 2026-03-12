import { redirect } from "next/navigation";
import { getUserFromToken } from "../../../lib/auth";
import StatsClient from "../../../components/StatsClient/StatsClient";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const user = await getUserFromToken();

  if (!user || user.role !== "ADMIN") {
    redirect("/accueil-page");
  }

  return <StatsClient />;
}