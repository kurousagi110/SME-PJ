"use server";

import { http } from "@/lib/http";

export interface OmniSearchItem {
  id: string;
  category: "order" | "product" | "material" | "partner" | "contract" | "batch";
  categoryLabel: string;
  code: string;
  title: string;
  subtitle: string;
  route: string;
}

export async function omniSearchAction(query: string): Promise<{
  success: boolean;
  data: OmniSearchItem[];
}> {
  try {
    const q = query.trim();
    if (q.length < 2) return { success: true, data: [] };
    const res: any = await http.get(`/search?q=${encodeURIComponent(q)}&limit=4`);
    return {
      success: !!res?.success,
      data: Array.isArray(res?.data) ? res.data : [],
    };
  } catch {
    return { success: false, data: [] };
  }
}
