"use client";

import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { useUploadAttachmentMutation } from "@/api/services/attachments.api";
import type { Attachment, AttachmentKind } from "@/api/types";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";

const MAX_BYTES = 10 * 1024 * 1024;

const ACCEPT: Record<AttachmentKind, string> = {
  LOGO: "image/jpeg,image/png,image/webp",
  PROFILE_PHOTO: "image/jpeg,image/png,image/webp",
  SITE_PHOTO: "image/jpeg,image/png,image/webp",
  RECEIPT: "image/jpeg,image/png,image/webp,application/pdf",
  DOCUMENT: "image/jpeg,image/png,image/webp,application/pdf",
  PAYMENT_SLIP: "image/jpeg,image/png,image/webp,application/pdf",
  VOICE_NOTE: "audio/mpeg,audio/mp4,audio/ogg",
};

export interface UploadedFile {
  id: string;
  url: string | null;
  fileName: string;
  mimeType: string;
}

export interface FileUploadProps {
  kind: AttachmentKind;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null, attachment?: Attachment) => void;
  label?: string;
  hint?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}

/**
 * Drop zone → POST /attachments (multipart, kind) → returns the attachment id the form
 * submits. Validates type and the 10 MB limit before uploading; previews images.
 */
export function FileUpload({ kind, value, onChange, label, hint, invalid, disabled, id }: FileUploadProps) {
  const language = useLanguage();
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading }] = useUploadAttachmentMutation();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const accept = ACCEPT[kind];

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!accept.split(",").includes(file.type)) {
      setError(kind === "LOGO" ? "Use a JPEG, PNG or WebP image." : "Use an image (JPEG, PNG, WebP) or a PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("The file is larger than 10 MB.");
      return;
    }
    try {
      const attachment = await upload({ file, kind }).unwrap();
      onChange(
        { id: attachment.id, url: attachment.url, fileName: attachment.fileName, mimeType: attachment.mimeType },
        attachment,
      );
    } catch (err) {
      setError(getErrorMessage(err, language));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) void handleFile(event.dataTransfer.files[0]);
  };

  const isImage = value?.mimeType.startsWith("image/");

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          {isImage && value.url ? (
            // Signed, short-lived URL from the API — not a static asset Next can optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt={value.fileName} className="size-16 rounded-lg border object-contain" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-7" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">{value.mimeType}</p>
          </div>
          {!disabled ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => onChange(null)}>
              <X />
            </Button>
          ) : null}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-muted/40",
            invalid && "border-destructive",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          {isLoading ? (
            <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
          ) : (
            <UploadCloud className="size-7 text-muted-foreground" aria-hidden />
          )}
          <span className="text-sm font-medium">{isLoading ? "Uploading…" : (label ?? "Click to upload or drag a file here")}</span>
          <span className="text-xs text-muted-foreground">{hint ?? "Max 10 MB"}</span>
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled || isLoading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
        aria-invalid={invalid || Boolean(error) || undefined}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
