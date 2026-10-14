"use client";

import { Copy, KeyRound, MessageCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useIssueLoginCodeMutation, useSetUserPasswordMutation } from "@/api/services/team.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatPhone } from "@/lib/phone";
import { useT } from "@/i18n/useT";

/** wa.me link that opens WhatsApp with the code typed in, ready to send. */
export function whatsAppCodeLink(phone: string, code: string): string {
  const text = `Munshi app login code: ${code} (10 minute ke liye, sirf ek baar). Phone: ${formatPhone(phone)}`;
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/**
 * Edit member → Sign-in help (munshi only). SMS may not reach the munshi's phone, so the
 * owner can show a one-time sign-in code to pass on (or send on WhatsApp), or set a password.
 */
export function MunshiSignIn({ userId, name }: { userId: string; name: string }) {
  const t = useT();
  const run = useMutationToast();
  const [issue, { isLoading: issuing }] = useIssueLoginCodeMutation();
  const [setPassword, { isLoading: saving }] = useSetUserPasswordMutation();
  const [issued, setIssued] = useState<{ phone: string; code: string; expiresIn: number } | null>(null);
  const [password, setPasswordValue] = useState("");

  const getCode = async () => {
    const result = await run(() => issue(userId).unwrap());
    if (result) setIssued(result);
  };

  const savePassword = async () => {
    const ok = await run(() => setPassword({ id: userId, password }).unwrap(), {
      success: t("teamCompany.munshi.passwordSet", { name }),
    });
    if (ok) setPasswordValue("");
  };

  return (
    <section className="space-y-4 rounded-xl border p-4" aria-label={t("teamCompany.munshi.title")}>
      <div>
        <p className="text-sm font-semibold">{t("teamCompany.munshi.title")}</p>
        <p className="text-xs text-muted-foreground">
          {t("teamCompany.munshi.desc", { name })}
        </p>
      </div>

      <div className="space-y-2">
        {issued ? (
          <div className="space-y-2 rounded-lg bg-muted p-3">
            <p className="font-mono text-3xl font-semibold tracking-[0.3em]" data-testid="login-code">
              {issued.code}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("teamCompany.munshi.validFor", { n: Math.round(issued.expiresIn / 60) })} · <bdi dir="ltr">{formatPhone(issued.phone)}</bdi>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard?.writeText(issued.code)}
              >
                <Copy data-icon="inline-start" />
                {t("action.copy")}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={whatsAppCodeLink(issued.phone, issued.code)} target="_blank" rel="noreferrer">
                  <MessageCircle data-icon="inline-start" />
                  {t("teamCompany.munshi.sendWhatsApp")}
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void getCode()} disabled={issuing}>
                <RefreshCw data-icon="inline-start" />
                {t("teamCompany.munshi.newCode")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => void getCode()} disabled={issuing}>
            <KeyRound data-icon="inline-start" />
            {t("teamCompany.munshi.getCode")}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`munshi-password-${userId}`}>{t("teamCompany.munshi.setPassword")}</Label>
        <div className="flex gap-2">
          <Input
            id={`munshi-password-${userId}`}
            type="password"
            autoComplete="new-password"
            placeholder={t("teamCompany.munshi.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
          />
          <Button onClick={() => void savePassword()} disabled={saving || password.length < 8}>
            {t("common.save")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("teamCompany.munshi.passwordHint")}
        </p>
      </div>
    </section>
  );
}
