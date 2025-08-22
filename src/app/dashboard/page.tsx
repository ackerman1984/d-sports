import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { BaseballNavigation } from "@/components/layout/baseball-navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { AnotadorDashboard } from "@/components/dashboard/anotador-dashboard";
import { JugadorDashboard } from "@/components/dashboard/jugador-dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const renderDashboardByRole = () => {
    switch (session.user.role) {
      case 'admin':
        return <AdminDashboard user={session.user} />;
      case 'anotador':
        return <AnotadorDashboard user={session.user} />;
      case 'jugador':
        return <JugadorDashboard user={session.user} />;
      default:
        return <div>Rol no reconocido</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BaseballNavigation user={session.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="fade-in">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-4xl">⚾</span>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Baseball SaaS Dashboard
              </h1>
              <p className="text-foreground/60">
                Bienvenido, {session.user.name} ({session.user.role})
              </p>
            </div>
          </div>
          
          {renderDashboardByRole()}
        </div>
      </main>
    </div>
  );
}