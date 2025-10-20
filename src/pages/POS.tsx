import { useState, useEffect } from "react";
import QRCode from "react-qr-code"; // Make sure it's installed
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Types
interface Item {
  id: string;
  name: string;
  quantity: number;
  sku: string;
}

interface SaleRecord {
  id: string;
  item_id: string;
  quantity: number;
  price: number;
  created_at: string;
  user_id: string;
  sku?: string;
}

const POS = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  // Fetch Items
  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase.from("items").select("*");
      if (error) throw error;
      if (data) setItems(data as Item[]);
    } catch (err: any) {
      toast.error("Failed to fetch items: " + err.message);
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch Sales
  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const { data, error } = await supabase.from("sales").select("*");
      if (error) throw error;
      if (data) setSales(data as SaleRecord[]);
    } catch (err: any) {
      toast.error("Failed to fetch sales: " + err.message);
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchSales();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">POS System</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Items</h2>
        {loadingItems ? (
          <p>Loading items...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="p-4 border rounded flex flex-col items-center gap-2">
                <h3 className="font-medium">{item.name}</h3>
                <p>Stock: {item.quantity}</p>
                <QRCode value={item.sku} size={128} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Sales</h2>
        {loadingSales ? (
          <p>Loading sales...</p>
        ) : (
          <table className="w-full border-collapse border">
            <thead>
              <tr className="border-b">
                <th className="border px-2 py-1">Item ID</th>
                <th className="border px-2 py-1">Quantity</th>
                <th className="border px-2 py-1">Price</th>
                <th className="border px-2 py-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b">
                  <td className="border px-2 py-1">{sale.item_id}</td>
                  <td className="border px-2 py-1">{sale.quantity}</td>
                  <td className="border px-2 py-1">${sale.price}</td>
                  <td className="border px-2 py-1">{new Date(sale.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Button
        className="mt-4"
        onClick={() => {
          fetchItems();
          fetchSales();
        }}
      >
        Refresh Data
      </Button>
    </div>
  );
};

export default POS;
