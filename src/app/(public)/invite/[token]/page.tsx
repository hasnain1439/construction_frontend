import type { Metadata } from "next";
import { Suspense } from "react";
import { AcceptInviteView } from "@/features/auth/views/AcceptInviteView";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function Page({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  return (
    <Suspense>
      <AcceptInviteView token={token} />
    </Suspense>
  );
}
