import { AppWindowIcon, CodeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Orders from "./orders";
import OrdersManagement from "./management";
export default function Page() {
  return (
    <div className="w-full">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="account" className="flex-1">
            Tạo đơn bán hàng
          </TabsTrigger>
          <TabsTrigger value="password" className="flex-1">
            Quản lý đơn bán hàng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="w-full">
          <Orders />
        </TabsContent>
        <TabsContent value="password" className="w-full">
          <OrdersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
