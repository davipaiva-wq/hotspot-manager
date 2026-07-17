import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { role: string }).role !== "admin") {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav onSignOut={handleSignOut} />
      <main className="p-4 sm:p-8 max-w-screen-xl mx-auto">
        {children}
      </main>
    </div>
  );
}
