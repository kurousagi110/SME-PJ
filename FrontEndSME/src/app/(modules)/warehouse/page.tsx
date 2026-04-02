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
import FinishedGoods from "./finished-goods";
import RawMaterialInventory from "./raw-material-inventory";
export default function Page() {
  return (
    <div className="w-full">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="account" className="flex-1">
            Kho thành phẩm
          </TabsTrigger>
          <TabsTrigger value="password" className="flex-1">
            Kho nguyên vật liệu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="w-full">
          <FinishedGoods />
        </TabsContent>
        <TabsContent value="password" className="w-full">
          <RawMaterialInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
