import AdminVerification from "../../../components/admin/AdminVerification";
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../../lib/auth";
export default async function EmailPage() {
  const user = await getUserFromToken();

  if (!user || user.role !== "ADMIN") {
    redirect("/accueil-page");
  }

  return <AdminVerification/>;
}
