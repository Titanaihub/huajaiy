import ShopProductsManager from "../../../../../components/ShopProductsManager";

export const metadata = {
  title: "จัดการสินค้า | HUAJAIY",
  description: "เพิ่มและแก้ไขสินค้าในร้าน"
};

export default function ShopProductsPage({ params }) {
  return <ShopProductsManager shopId={params.shopId} />;
}
