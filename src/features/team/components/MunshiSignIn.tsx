"use client";

import { Copy, KeyRound, MessageCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useIssueLoginCodeMutation, useSetUserPasswordMutation } from "@/api/services/team.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatPhone } from "@/lib/phone";

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
      success: `Password set — ${name} can now sign in with phone + password`,
    });
    if (ok) setPasswordValue("");
  };

  return (
    <section className="space-y-4 rounded-xl border p-4" aria-label="Sign-in help">
      <div>
        <p className="text-sm font-semibold">Sign-in help</p>
        <p className="text-xs text-muted-foreground">
          If the SMS code doesn&apos;t reach {name}&apos;s phone, give a code from here or set a password.
        </p>
      </div>

      <div className="space-y-2">
        {issued ? (
          <div className="space-y-2 rounded-lg bg-muted p-3">
            <p className="font-mono text-3xl font-semibold tracking-[0.3em]" data-testid="login-code">
              {issued.code}
            </p>
            <p className="text-xs text-muted-foreground">
              Valid for {Math.round(issued.expiresIn / 60)} minutes · works once · {formatPhone(issued.phone)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard?.writeText(issued.code)}
              >
                <Copy data-icon="inline-start" />
                Copy
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={whatsAppCodeLink(issued.phone, issued.code)} target="_blank" rel="noreferrer">
                  <MessageCircle data-icon="inline-start" />
                  Send on WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void getCode()} disabled={issuing}>
                <RefreshCw data-icon="inline-start" />
                New code
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => void getCode()} disabled={issuing}>
            <KeyRound data-icon="inline-start" />
            Get login code
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`munshi-password-${userId}`}>Set a password</Label>
        <div className="flex gap-2">
          <Input
            id={`munshi-password-${userId}`}
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters, letters + numbers"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
          />
          <Button onClick={() => void savePassword()} disabled={saving || password.length < 8}>
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The munshi app then also signs in with phone + password.
        </p>
      </div>
    </section>
  );
}
