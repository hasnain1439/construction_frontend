"use client";

import { ShieldOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { canAccess, type AccessRule } from "@/lib/permissions";
import { useMe } from "@/store/hooks";
import { EmptyState } from "./EmptyState";
import { SectionCard } from "./SectionCard";

/**
 * Page-level gate for direct URL visits (the menu already hides the item). The API
 * refuses the data anyway; this explains it instead of showing an error.
 */
export function RequireAccess({ children, ...rule }: AccessRule & { children: ReactNode }) {
  const me = useMe();
  if (!me) return null;
  if (canAccess(me, rule)) return <>{children}</>;
  return (
    <SectionCard>
      <EmptyState
        icon={ShieldOff}
        title="Not available for your role"
        description="Ask your Thekedar if you need access to this page."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        }
      />
    </SectionCard>
  );
}
