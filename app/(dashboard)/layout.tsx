import { redirect } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { PageTransition } from "@/components/page-transition";
import { auth, signOut } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userName = session.user.name ?? "Terapeuta";
  const userEmail = session.user.email ?? "";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f1e5" }}>
      <TopNav
        userName={userName}
        userEmail={userEmail}
        logoutAction={logoutAction}
      />
      <main className="flex-1 px-8 py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
