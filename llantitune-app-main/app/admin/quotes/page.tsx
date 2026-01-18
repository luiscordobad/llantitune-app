import QuotesTableClient from "./quotes-table-client";
import { getQuotesPaged } from "@/lib/quotes/getQuotes";

type SearchParams = {
  page?: string;
  pageSize?: string;
};

export default async function QuotesPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (props.searchParams ? await props.searchParams : {}) ?? {};

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp.pageSize ?? "20") || 20));

  // getQuotesPaged() signature: getQuotesPaged({ page, pageSize })
  const { rows: quotes, total, page: currentPage, pageSize: currentPageSize } =
    await getQuotesPaged({ page, pageSize });

  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));

  return (
    <QuotesTableClient
      quotes={quotes}
      page={currentPage}
      pageSize={currentPageSize}
      total={total}
      totalPages={totalPages}
    />
  );
}
