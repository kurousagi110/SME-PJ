import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateProductionOrder from "./create-production-order";
import ProductionOrdersManagement from "./production-orders-management";
import ProductionKanban from "./production-kanban";

export default function Page() {
  return (
    <div className="w-full">
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="kanban" className="flex-1 font-semibold text-primary">
            Tiến độ xưởng (Kanban & Hao hụt)
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex-1">
            Danh sách đơn sản xuất
          </TabsTrigger>
          <TabsTrigger value="create" className="flex-1">
            Tạo đơn nhập sản xuất
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="w-full mt-4">
          <ProductionKanban />
        </TabsContent>

        <TabsContent value="manage" className="w-full mt-4">
          <ProductionOrdersManagement />
        </TabsContent>

        <TabsContent value="create" className="w-full mt-4">
          <CreateProductionOrder />
        </TabsContent>
      </Tabs>
    </div>
  );
}

