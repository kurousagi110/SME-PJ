import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateProductionOrder from "./create-production-order";
import ProductionOrdersManagement from "./production-orders-management";

export default function Page() {
  return (
    <div className="w-full">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="create" className="flex-1">
            Tạo đơn nhập sản xuất
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex-1">
            Quản lý đơn nhập sản xuất
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="w-full">
          <CreateProductionOrder />
        </TabsContent>

        <TabsContent value="manage" className="w-full">
          <ProductionOrdersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
