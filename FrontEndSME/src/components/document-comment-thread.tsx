"use client";

import * as React from "react";
import { MessageSquare, Send, User, AtSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { themBinhLuanDonHangAction } from "@/app/actions/handover";

export interface CommentItem {
  id: string;
  user_id?: string;
  tai_khoan?: string;
  ho_ten?: string;
  phong_ban?: string;
  noi_dung: string;
  mentions?: string[];
  created_at?: string;
}

interface Props {
  orderId: string;
  comments?: CommentItem[];
  onCommentAdded?: (newComment: CommentItem) => void;
  className?: string;
}

function fmtTime(iso?: string) {
  if (!iso) return "Vừa xong";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DocumentCommentThread({
  orderId,
  comments = [],
  onCommentAdded,
  className = "",
}: Props) {
  const [commentList, setCommentList] = React.useState<CommentItem[]>(comments);
  const [inputText, setInputText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setCommentList(comments);
  }, [comments]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await themBinhLuanDonHangAction(orderId, inputText.trim());
      if (res.success && res.data) {
        toast.success("Đã đăng ghi chú nội bộ");
        const newCom = res.data as CommentItem;
        setCommentList((prev) => [...prev, newCom]);
        setInputText("");
        onCommentAdded?.(newCom);
      } else {
        toast.error(res.error || "Không thể gửi thảo luận");
      }
    } catch (err: any) {
      toast.error(err.message || "Gửi thảo luận thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMention = (tag: string) => {
    setInputText((prev) => (prev ? `${prev.trim()} @${tag} ` : `@${tag} `));
  };

  return (
    <div className={`p-4 rounded-xl border bg-card/60 shadow-xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>Trao đổi nội bộ & Dặn dò chứng từ ({commentList.length})</span>
        </div>

        {/* Quick mention tags */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline">Tag nhanh:</span>
          {["thukho", "ketoan", "kinhdoanh", "giamdoc"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addMention(tag)}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
            >
              @{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Comment history list */}
      <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
        {commentList.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground italic">
            Chưa có ghi chú nội bộ nào. Hãy gửi lời nhắn hoặc dặn dò các ban tại đây.
          </div>
        ) : (
          commentList.map((c, idx) => (
            <div key={c.id || idx} className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{c.ho_ten || c.tai_khoan || "Nhân viên"}</span>
                  {c.phong_ban && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal text-muted-foreground">
                      {c.phong_ban}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {fmtTime(c.created_at)}
                </span>
              </div>

              {/* Render comment text with highlighted mentions */}
              <div className="text-foreground leading-relaxed pl-4">
                {c.noi_dung.split(/(@\w+)/g).map((part, i) =>
                  part.startsWith("@") ? (
                    <span key={i} className="font-bold text-primary bg-primary/10 px-1 rounded-sm">
                      {part}
                    </span>
                  ) : (
                    part
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input box */}
      <div className="flex items-center gap-2 pt-1">
        <Input
          placeholder="Nhập ghi chú hoặc gõ @username để dặn dò đồng nghiệp..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="text-xs h-9 rounded-lg"
          disabled={isSubmitting}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!inputText.trim() || isSubmitting}
          className="h-9 px-3 rounded-lg"
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Gửi
        </Button>
      </div>
    </div>
  );
}
