"use client";

import { Download, Eye, Loader2, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { SharedPdf } from "@/api/types";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { DocumentPreview } from "./DocumentPreview";

/** WhatsApp click-to-chat link: digits only (no +), message URL-encoded. Without a phone, the share sheet picks the chat. */
export function whatsappUrl(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * Preview / Download / Share on WhatsApp for a generated PDF. `load` asks the API for a fresh
 * signed URL (and the ready message) each time, so links never go stale.
 */
export function PdfActions({ load, title, phone, size = "sm" }: { load: () => Promise<SharedPdf>; title: string; phone?: string | null; size?: "sm" | "default" }) {
  const run = useMutationToast();
  const [busy, setBusy] = useState<"preview" | "download" | "share" | null>(null);
  const [preview, setPreview] = useState<SharedPdf | null>(null);
  const act = async (kind: "preview" | "download" | "share") => {
    setBusy(kind);
    const pdf = await run(load);
    setBusy(null);
    if (!pdf) return;
    if (kind === "preview") setPreview(pdf);
    if (kind === "download") window.open(pdf.url, "_blank", "noopener");
    if (kind === "share") window.open(whatsappUrl(phone ?? pdf.clientPhone, pdf.whatsappText), "_blank", "noopener");
  };
  const icon = (kind: typeof busy, Icon: typeof Eye) => (busy === kind ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />);
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size={size} variant="outline" onClick={() => void act("preview")} disabled={busy !== null}>
        {icon("preview", Eye)}
        Preview
      </Button>
      <Button type="button" size={size} variant="outline" onClick={() => void act("download")} disabled={busy !== null}>
        {icon("download", Download)}
        Download
      </Button>
      <Button type="button" size={size} variant="success" onClick={() => void act("share")} disabled={busy !== null}>
        {icon("share", MessageCircle)}
        WhatsApp
      </Button>
      {preview ? <DocumentPreview url={preview.url} title={title} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}
