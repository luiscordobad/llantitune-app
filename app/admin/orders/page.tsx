import OrdersClient from "./OrdersClient";

export default function OrdersPage({ searchParams }: { searchParams?: any }) {
  const openOrderId =
    typeof searchParams?.open === "string" ? (searchParams.open as string) : null;

  return <OrdersClient openOrderId={openOrderId} />;
}
