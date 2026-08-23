import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";

export default async function Home() {
  const me = await currentUser();
  if (!me) redirect("/login");
  redirect(me.role === "ADMIN" ? "/admin" : "/me");
}
