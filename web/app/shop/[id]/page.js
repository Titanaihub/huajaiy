import { notFound } from "next/navigation";
import ProductDetailClient from "../../../components/ProductDetailClient";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  return {
    title: "สินค้า | HUAJAIY",
    description: "รายละเอียดสินค้า"
  };
}

export default function ProductDetailPage({ params }) {
  const id = params.id;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <ProductDetailClient productId={id} />
      <SiteFooter />
    </>
  );
}
