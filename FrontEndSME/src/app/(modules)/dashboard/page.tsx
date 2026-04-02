import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import DashboardOrdersTable from "@/components/dashboard-orders-table";

export default function Page() {
  return (
    <>
      <div className="px-4 lg:px-6 space-y-6">
        <ChartAreaInteractive />
        <DashboardOrdersTable />
      </div>
    </>
  );
}
