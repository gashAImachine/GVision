import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <DashboardShell user={user}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Incidents", value: "—", change: null },
            { label: "Open Cases", value: "—", change: null },
            { label: "Avg Resolution", value: "—", change: null },
            { label: "Severity Score", value: "—", change: null },
          ].map((kpi) => (
            <div key={kpi.label} className="glass rounded-xl p-5">
              <p className="text-sm text-night-400 mb-1">{kpi.label}</p>
              <p className="text-2xl font-semibold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Placeholder panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass rounded-xl p-6 min-h-[300px] flex items-center justify-center">
            <p className="text-night-500 text-sm">
              Incident trend chart will render here
            </p>
          </div>
          <div className="glass rounded-xl p-6 min-h-[300px] flex items-center justify-center">
            <p className="text-night-500 text-sm">
              Incident type breakdown will render here
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
