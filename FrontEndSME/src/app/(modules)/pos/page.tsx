"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconShoppingCart,
  IconBarcode,
  IconSearch,
  IconTrash,
  IconPlus,
  IconMinus,
  IconCreditCard,
  IconCash,
  IconPrinter,
  IconCheck,
  IconReceipt,
  IconUser,
  IconArrowLeft,
  IconRefresh,
} from "@tabler/icons-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useMyProfile } from "@/hooks/use-account";
import { useProductList } from "@/hooks/use-product";
import { fetchDoiTacAction, type DoiTacItem } from "@/app/actions/doi-tac";
import { checkoutPosAction, type PosOrderItemPayload } from "@/app/actions/pos";
import { printPosThermalReceipt, type PosReceiptData } from "@/lib/barcode";

interface CartItem {
  san_pham_id: string;
  ma_sp: string;
  ten_sp: string;
  don_gia: number;
  so_luong: number;
  don_vi: string;
  so_luong_ton: number;
}

export default function PosCashierPage() {
  const { data: profile } = useMyProfile();
  const cashierName = profile?.ho_ten || profile?.tai_khoan || "Thu ngân";

  // Data
  const { data: productRes, refetch: refetchProducts } = useProductList({
    page: 1,
    limit: 100,
    name: "",
  });
  const products = useMemo(() => {
    return (productRes?.data?.items || []) as any[];
  }, [productRes]);

  const [customers, setCustomers] = useState<DoiTacItem[]>([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("Khách lẻ tại quầy");
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string>("");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart & Payment
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"tien_mat" | "chuyen_khoan">("tien_mat");
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Dialog
  const [completedOrder, setCompletedOrder] = useState<PosReceiptData | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load Customers
  useEffect(() => {
    fetchDoiTacAction({ loai_doi_tac: "khach_hang", limit: 50 }).then((res) => {
      if (res.success && res.items) {
        setCustomers(res.items);
      }
    });
  }, []);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.danh_muc || p.loai) set.add(p.danh_muc || p.loai);
    }
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchTerm ||
        (p.ten_sp || "").toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (p.ma_sp || "").toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchCat =
        selectedCategory === "all" ||
        (p.danh_muc || p.loai) === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart Operations
  const addToCart = (product: any) => {
    const id = product._id;
    const stock = Number(product.so_luong ?? 0);

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.san_pham_id === id);
      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        if (item.so_luong >= stock) {
          toast.warning(`Kho chỉ còn ${stock} ${product.don_vi || "sản phẩm"}`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = { ...item, so_luong: item.so_luong + 1 };
        return updated;
      } else {
        if (stock <= 0) {
          toast.warning("Sản phẩm này hiện đang hết hàng trong kho!");
          return prev;
        }
        return [
          ...prev,
          {
            san_pham_id: id,
            ma_sp: product.ma_sp,
            ten_sp: product.ten_sp,
            don_gia: product.gia_ban || product.don_gia || 0,
            so_luong: 1,
            don_vi: product.don_vi || "cái",
            so_luong_ton: stock,
          },
        ];
      }
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.san_pham_id === id) {
            const newQty = item.so_luong + delta;
            if (newQty > item.so_luong_ton) {
              toast.warning(`Tồn kho chỉ còn ${item.so_luong_ton} ${item.don_vi}`);
              return item;
            }
            return { ...item, so_luong: newQty };
          }
          return item;
        })
        .filter((item) => item.so_luong > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.san_pham_id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCashGiven(0);
  };

  // Barcode / Scanner input handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim().toLowerCase();
    if (!query) return;

    // Look for exact SKU match first
    const exact = products.find((p) => (p.ma_sp || "").toLowerCase() === query);
    if (exact) {
      addToCart(exact);
      setSearchTerm("");
      toast.success(`Đã thêm: ${exact.ten_sp}`);
      return;
    }

    // Look for single matching item
    const matched = products.filter(
      (p) =>
        (p.ma_sp || "").toLowerCase().includes(query) ||
        (p.ten_sp || "").toLowerCase().includes(query)
    );
    if (matched.length === 1) {
      addToCart(matched[0]);
      setSearchTerm("");
      toast.success(`Đã thêm: ${matched[0].ten_sp}`);
    } else if (matched.length === 0) {
      toast.error(`Không tìm thấy sản phẩm với mã "${query}"`);
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.don_gia * it.so_luong, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0));
  }, [subtotal, discount]);

  const changeAmount = useMemo(() => {
    if (cashGiven <= 0) return 0;
    return Math.max(0, cashGiven - grandTotal);
  }, [cashGiven, grandTotal]);

  // Set exact cash
  const handleExactCash = () => {
    setCashGiven(grandTotal);
  };

  // Checkout Action
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.warning("Giỏ hàng đang trống! Vui lòng chọn sản phẩm.");
      return;
    }

    if (paymentMethod === "tien_mat" && cashGiven > 0 && cashGiven < grandTotal) {
      toast.warning("Tiền khách đưa chưa đủ để thanh toán!");
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload: PosOrderItemPayload[] = cart.map((c) => ({
        san_pham_id: c.san_pham_id,
        ma_sp: c.ma_sp,
        ten_sp: c.ten_sp,
        don_gia: c.don_gia,
        so_luong: c.so_luong,
        thanh_tien: c.don_gia * c.so_luong,
        don_vi: c.don_vi,
        loai_hang: "san_pham",
      }));

      const finalCashGiven = cashGiven > 0 ? cashGiven : grandTotal;

      const res = await checkoutPosAction({
        khach_hang_ten: selectedCustomerName || "Khách lẻ tại quầy",
        so_dien_thoai: selectedCustomerPhone,
        san_pham: itemsPayload,
        giam_gia: discount,
        phuong_thuc_tt: paymentMethod,
        tien_khach_dua: finalCashGiven,
        ghi_chu: notes || "Bán lẻ tại quầy POS",
      });

      if (!res.success) {
        toast.error(res.message || "Thanh toán thất bại");
        return;
      }

      const orderCode = res.data?.ma_dh || "DH-POS";

      const receiptData: PosReceiptData = {
        orderCode,
        createdAt: currentTime,
        cashierName,
        customerName: selectedCustomerName,
        customerPhone: selectedCustomerPhone,
        items: cart.map((it) => ({
          name: it.ten_sp,
          code: it.ma_sp,
          quantity: it.so_luong,
          price: it.don_gia,
          total: it.don_gia * it.so_luong,
        })),
        subtotal,
        discount,
        total: grandTotal,
        paidAmount: finalCashGiven,
        changeAmount: Math.max(0, finalCashGiven - grandTotal),
        paymentMethod,
        notes,
      };

      setCompletedOrder(receiptData);
      setShowSuccessDialog(true);
      toast.success("Thanh toán thành công & Đã tự động trừ kho và ghi sổ quỹ!");

      // Print receipt automatically
      printPosThermalReceipt(receiptData);

      // Reset cart
      clearCart();
      refetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Lỗi hệ thống khi thanh toán");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -m-6 overflow-hidden bg-muted/20">
      {/* POS Top Bar */}
      <header className="h-14 bg-background border-b px-4 flex items-center justify-between gap-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 h-9">
              <IconArrowLeft className="h-4 w-4" /> Thoát POS
            </Button>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <h1 className="font-bold text-lg hidden sm:flex items-center gap-2">
            <IconShoppingCart className="h-5 w-5 text-primary" />
            Quầy Thu Ngân POS
          </h1>
        </div>

        {/* Quick Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <IconBarcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={barcodeInputRef}
              placeholder="Bắn mã vạch súng quét hoặc gõ mã SP + Enter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-muted/40 font-mono text-sm"
              autoFocus
            />
          </div>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="hidden md:flex items-center gap-1 font-medium">
            <IconUser className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground">{cashierName}</span>
          </div>
          <Badge variant="outline" className="font-mono text-xs hidden lg:inline-flex">
            {currentTime}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchProducts()}
            className="h-8 w-8 p-0"
            title="Làm mới tồn kho"
          >
            <IconRefresh className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* POS Main Screen: 2 Columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Section: Product Grid (8 cols on lg) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col border-r bg-background overflow-hidden">
          {/* Category Filter Pills */}
          <div className="p-3 border-b flex items-center gap-2 overflow-x-auto whitespace-nowrap bg-muted/10 shrink-0">
            <Button
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              className="h-7 text-xs rounded-full"
              onClick={() => setSelectedCategory("all")}
            >
              Tất cả ({products.length})
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? "default" : "outline"}
                className="h-7 text-xs rounded-full"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const stock = Number(p.so_luong ?? 0);
                const isOutOfStock = stock <= 0;
                const price = p.gia_ban || p.don_gia || 0;

                return (
                  <div
                    key={p._id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all select-none ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed bg-muted/30"
                        : "cursor-pointer hover:border-primary hover:shadow-md active:scale-95 bg-card"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                          {p.ma_sp}
                        </Badge>
                        <Badge
                          variant={isOutOfStock ? "destructive" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {isOutOfStock ? "Hết hàng" : `Tồn: ${stock}`}
                        </Badge>
                      </div>
                      <div className="font-semibold text-sm line-clamp-2 leading-snug">
                        {p.ten_sp}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t flex items-center justify-between">
                      <span className="font-bold text-sm text-primary">
                        {price.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="text-[11px] text-muted-foreground">/{p.don_vi || "cái"}</span>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground text-sm">
                  Không có sản phẩm nào phù hợp với bộ lọc hiện tại.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Cart & Payment Checkout (5 cols on lg) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-background h-full overflow-hidden">
          {/* Cart Header & Customer Picker */}
          <div className="p-3 border-b space-y-2 bg-muted/10 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <IconReceipt className="h-4 w-4 text-primary" />
                Đơn Bán Lẻ ({cart.length} món)
              </span>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2"
                >
                  <IconTrash className="h-3.5 w-3.5" /> Xóa giỏ
                </Button>
              )}
            </div>

            {/* Customer select box */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedCustomerName}
                onValueChange={(val) => {
                  setSelectedCustomerName(val);
                  const cust = customers.find((c) => c.ten === val);
                  if (cust) setSelectedCustomerPhone(cust.so_dien_thoai || "");
                }}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Chọn khách hàng..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Khách lẻ tại quầy">👤 Khách lẻ tại quầy</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c.ten}>
                      {c.ten} {c.nhom === "vip" ? "⭐ VIP" : ""} ({c.so_dien_thoai || c.ma_doi_tac})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-border/60">
            {cart.map((item) => (
              <div key={item.san_pham_id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs truncate leading-tight">{item.ten_sp}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {item.don_gia.toLocaleString("vi-VN")} đ / {item.don_vi}
                  </div>
                </div>

                {/* Quantity adjuster */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => updateQuantity(item.san_pham_id, -1)}
                  >
                    <IconMinus className="h-3 w-3" />
                  </Button>
                  <span className="w-7 text-center font-bold text-xs">{item.so_luong}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => updateQuantity(item.san_pham_id, 1)}
                  >
                    <IconPlus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Total & Remove */}
                <div className="text-right shrink-0 min-w-[70px]">
                  <div className="font-bold text-xs">
                    {(item.don_gia * item.so_luong).toLocaleString("vi-VN")} đ
                  </div>
                  <button
                    onClick={() => removeFromCart(item.san_pham_id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive mt-0.5"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-xs">
                <IconShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                Giỏ hàng trống. Click sản phẩm hoặc quét mã barcode để bán hàng.
              </div>
            )}
          </div>

          {/* Payment Details & Calculations (Pinned Bottom) */}
          <div className="p-3 border-t bg-muted/10 space-y-3 shrink-0">
            {/* Calculation summary */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tổng tiền hàng:</span>
                <span className="font-semibold text-foreground">
                  {subtotal.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Chiết khấu / Giảm giá:</span>
                <Input
                  type="number"
                  min="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0 đ"
                  className="w-24 h-6 text-right text-xs py-0 px-1 font-semibold"
                />
              </div>
              <div className="flex justify-between items-center pt-1 border-t text-sm font-bold">
                <span>KHÁCH CẦN TRẢ:</span>
                <span className="text-base text-primary font-black">
                  {grandTotal.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "tien_mat" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setPaymentMethod("tien_mat")}
              >
                <IconCash className="h-4 w-4" /> Tiền mặt
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "chuyen_khoan" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setPaymentMethod("chuyen_khoan")}
              >
                <IconCreditCard className="h-4 w-4" /> Chuyển khoản QR
              </Button>
            </div>

            {/* Cash Given & Quick Amount Buttons */}
            {paymentMethod === "tien_mat" && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Tiền khách đưa:</Label>
                  <Input
                    type="number"
                    value={cashGiven || ""}
                    onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                    placeholder="Nhập số tiền..."
                    className="w-32 h-7 text-right text-xs font-bold"
                  />
                </div>

                {/* Quick cash denomination buttons */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] p-0 font-medium"
                    onClick={handleExactCash}
                  >
                    Đủ tiền
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] p-0 font-medium"
                    onClick={() => setCashGiven(100000)}
                  >
                    100k
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] p-0 font-medium"
                    onClick={() => setCashGiven(200000)}
                  >
                    200k
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] p-0 font-medium"
                    onClick={() => setCashGiven(500000)}
                  >
                    500k
                  </Button>
                </div>

                {/* Change return amount */}
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-muted-foreground">Tiền thối lại:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    {changeAmount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>
            )}

            {/* Big Checkout Button */}
            <Button
              size="lg"
              className="w-full h-11 text-sm font-bold gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleCheckout}
            >
              <IconPrinter className="h-5 w-5" />
              {isSubmitting ? "Đang xử lý..." : "THANH TOÁN & IN BILL (F9)"}
            </Button>
          </div>
        </div>
      </div>

      {/* Post Checkout Success Modal */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
              <IconCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold">Thanh Toán Hoàn Tất!</DialogTitle>
          </DialogHeader>

          {completedOrder && (
            <div className="space-y-3 py-2 text-sm">
              <div className="p-3 rounded-lg bg-muted/40 space-y-1.5 text-xs text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mã đơn hàng:</span>
                  <span className="font-mono font-bold">{completedOrder.orderCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Khách hàng:</span>
                  <span className="font-semibold">{completedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng thanh toán:</span>
                  <span className="font-bold text-primary">
                    {completedOrder.total.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                {completedOrder.changeAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Tiền thối trả khách:</span>
                    <span>{completedOrder.changeAmount.toLocaleString("vi-VN")} đ</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Hóa đơn nhiệt K80 đã được gửi đến lệnh in của máy tính.
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => completedOrder && printPosThermalReceipt(completedOrder)}
            >
              <IconPrinter className="h-4 w-4" /> In Lại Hóa Đơn
            </Button>
            <Button
              className="flex-1 gap-1"
              onClick={() => {
                setShowSuccessDialog(false);
                barcodeInputRef.current?.focus();
              }}
            >
              Bán Đơn Tiếp Theo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
