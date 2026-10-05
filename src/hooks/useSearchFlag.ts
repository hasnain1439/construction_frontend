"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Open/close state for a create panel that can also be opened from a link
 * (e.g. "+ Create → Invite member" → `/team/invitations?new=1`). Closing clears the flag.
 * Needs a <Suspense> boundary above (useSearchParams).
 */
export function useSearchFlag(name = "new"): [boolean, (open: boolean) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = searchParams.get(name) === "1";
  const [local, setLocal] = useState(false);

  const setOpen = useCallback(
    (open: boolean) => {
      setLocal(open);
      if (!open && searchParams.has(name)) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(name);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }
    },
    [name, pathname, router, searchParams],
  );

  return [local || fromUrl, setOpen];
}
