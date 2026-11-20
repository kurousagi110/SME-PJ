"use client";

import * as React from "react";
import { Camera, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CameraBarcodeScannerProps {
  onDetected: (code: string) => void;
  buttonLabel?: string;
  title?: string;
}

export function CameraBarcodeScanner({
  onDetected,
  buttonLabel = "Quét mã QR / Barcode",
  title = "Quét mã QR / Mã vạch bằng Camera",
}: CameraBarcodeScannerProps) {
  const [open, setOpen] = React.useState(false);
  const [manualCode, setManualCode] = React.useState("");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;

    async function startCamera() {
      setCameraError(null);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Trình duyệt hiện tại không hỗ trợ truy cập Camera. Vui lòng nhập mã thủ công bên dưới.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        if (!BarcodeDetectorCtor) {
          setCameraError(
            "Trình duyệt chưa hỗ trợ BarcodeDetector tự động. Bạn có thể nhập mã trực tiếp bên dưới."
          );
          return;
        }

        const detector = new BarcodeDetectorCtor({
          formats: ["qr_code", "code_128", "ean_13", "ean_8", "code_39"],
        });

        const scanLoop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              onDetected(String(barcodes[0].rawValue).trim());
              setOpen(false);
              return;
            }
          } catch {
            // ignore single-frame decode error
          }
          rafId = requestAnimationFrame(scanLoop);
        };
        rafId = requestAnimationFrame(scanLoop);
      } catch (err: any) {
        setCameraError(err?.message || "Không thể mở Camera. Vui lòng cấp quyền hoặc nhập mã thủ công.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [open, onDetected]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onDetected(manualCode.trim());
    setManualCode("");
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Camera className="h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{title}</span>
            </DialogTitle>
            <DialogDescription>
              Hướng camera vào mã QR hoặc mã vạch sản phẩm / chứng từ để nhận diện tự động.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-emerald-400/80 rounded-lg" />
            </div>

            {cameraError && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                {cameraError}
              </p>
            )}

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Hoặc nhập mã thủ công..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <Button type="submit" size="sm" className="gap-1 shrink-0">
                <Keyboard className="h-4 w-4" />
                Xác nhận
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
