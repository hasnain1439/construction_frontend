import { RequireAccess } from "@/components/common/RequireAccess";
import { QuoteDetailView } from "@/features/sales/QuoteDetailView";

export default async function Page({ params }: PageProps<"/sales/quotes/[quoteId]">) {
  const { quoteId } = await params;
  return (
    <RequireAccess permission="sales.quote.view">
      <QuoteDetailView quoteId={quoteId} />
    </RequireAccess>
  );
}
