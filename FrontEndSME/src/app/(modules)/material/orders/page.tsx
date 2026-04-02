"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateOrder from "./orders";
import OrdersManagerment from "./managerment";

export default function Page() {
  return (
    <div className="w-full">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="create" className="flex-1">
            Tạo đơn nhập
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex-1">
            Quản lý đơn nhập
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="w-full">
          <CreateOrder />
        </TabsContent>

        <TabsContent value="manage" className="w-full">
          <OrdersManagerment />
        </TabsContent>
      </Tabs>
    </div>
  );
}
