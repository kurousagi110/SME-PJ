import React from "react";
import { toast } from "sonner";

const confirmToast = (
  title: string,
  description: React.ReactNode,
  onConfirm: () => void
) => {
  toast.warning(title, {
    description,
    action: {
      label: "Xác nhận",
      onClick: onConfirm,
    },
    cancel: {
      label: "Hủy",
      onClick: () => {},
    },
    duration: 5000,
  });
};

export default confirmToast;
