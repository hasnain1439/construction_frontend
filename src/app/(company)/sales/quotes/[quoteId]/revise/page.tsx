import { RequireAccess } from "@/components/common/RequireAccess";
import { ReviseQuoteView } from "@/features/sales/NewQuoteView";

export default async function Page({ params }: PageProps<"/sales/quotes/[quoteId]/revise">) {
  const { quoteId } = await params;
  return (
    <RequireAccess permission="sales.quote.edit">
      <ReviseQuoteView quoteId={quoteId} />
    </RequireAccess>
  );
}
