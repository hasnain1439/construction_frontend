"use client";

import { ClipboardCopy, Mail, MessageCircle, MessageSquareText, Share2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

const subscribeNothing = () => () => {};

/** The message that goes with the link (Roman Urdu reads naturally on WhatsApp / SMS in Pakistan). */
export function inviteMessage({ name, companyName, roleLabel, url }: { name: string; companyName?: string; roleLabel?: string; url: string }) {
  const who = companyName ? `${companyName} ne` : "Aap ko";
  const as = roleLabel ? ` ${roleLabel} ke taur par` : "";
  return `Assalam-o-Alaikum ${name}! ${who} aap ko${as} Construction Platform par invite kiya hai. Account banane ke liye ye link kholein (ek dafa chalta hai, 7 din tak): ${url}`;
}

/** wa.me wants the number without "+" or spaces. */
const waNumber = (phone?: string) => (phone ?? "").replace(/\D/g, "");

/**
 * Share a one-time invite link when the SMS is slow or missing: copy it, or open WhatsApp /
 * SMS / email with the message ready (and the device's own share sheet where available).
 */
export function InviteShare({
  url,
  name,
  phone,
  email,
  companyName,
  roleLabel,
}: {
  url: string;
  name: string;
  phone?: string;
  email?: string | null;
  companyName?: string;
  roleLabel?: string;
}) {
  const t = useT();
  const message = inviteMessage({ name, companyName, roleLabel, url });
  const text = encodeURIComponent(message);
  // navigator.share only exists in the browser (mostly phones); render it after hydration.
  const canShare = useSyncExternalStore(subscribeNothing, () => typeof navigator.share === "function", () => false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("invite.linkCopied"));
    } catch {
      toast.error(t("common.somethingWrong"));
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/40 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("invite.shareTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("invite.shareHint")}</p>
      </div>
      <p dir="ltr" className="rounded-xl bg-card px-3 py-2 font-mono text-xs break-all text-muted-foreground" data-testid="invite-link">
        {url}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void copy()}>
          <ClipboardCopy data-icon="inline-start" />
          {t("invite.copyLink")}
        </Button>
        <Button size="sm" asChild className="bg-[#25D366] text-white hover:bg-[#1ebe5b]">
          <a href={`https://wa.me/${waNumber(phone)}?text=${text}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle data-icon="inline-start" />
            WhatsApp
          </a>
        </Button>
        {phone ? (
          <Button size="sm" variant="outline" asChild>
            <a href={`sms:${phone}?body=${text}`}>
              <MessageSquareText data-icon="inline-start" />
              SMS
            </a>
          </Button>
        ) : null}
        {email ? (
          <Button size="sm" variant="outline" asChild>
            <a href={`mailto:${email}?subject=${encodeURIComponent(t("invite.emailSubject"))}&body=${text}`}>
              <Mail data-icon="inline-start" />
              Email
            </a>
          </Button>
        ) : null}
        {canShare ? (
          <Button size="sm" variant="outline" onClick={() => void navigator.share({ title: t("invite.emailSubject"), text: message }).catch(() => undefined)}>
            <Share2 data-icon="inline-start" />
            {t("invite.shareMore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
