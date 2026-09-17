import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import DashboardOrdersTable from "@/components/dashboard-orders-table";
import { DashboardKpiCards } from "@/components/dashboard-kpi-cards";

export default function Page() {
  return (
    <>
      <div className="px-4 lg:px-6 space-y-6">
        <DashboardKpiCards />
        <ChartAreaInteractive />
        <DashboardOrdersTable />
      </div>
    </>
  );
}
