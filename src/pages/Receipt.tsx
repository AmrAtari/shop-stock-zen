import { useEffect, useState } from "react";
import QRCode from "react-qr-code"; // make sure it's installed
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Receipt / Sale type
interface SaleRecord {
  id: string;
  item_id: string;
  quantity: number;
  price: number;
  created_at: string;
  user_id: string;
  sku?: string;
}

const Receipt = () => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch sales / receipts
  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("sales").select("*");
      if (error) throw error;

      if (data) setSales(data as SaleRecord[]);
    } catch (err: any) {
      toast.error("Failed to fetch receipts: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Receipts</h1>

      {isLoading ? (
        <p>Loading receipts...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sales.map((sale) => (
            <div key={sale.id} className="p-4 border rounded flex flex-col gap-2">
              <h2 className="font-semibold">Receipt ID: {sale.id}</h2>
              <p>Item ID: {sale.item_id}</p>
              <p>Quantity: {sale.quantity}</p>
              <p>Price: ${sale.price}</p>
              <p>Date: {new Date(sale.created_at).toLocaleString()}</p>

              {/* QR code for receipt */}
              <div className="mt-2 flex justify-center">
                <QRCode
                  value={JSON.stringify({
                    receipt_id: sale.id,
                    item_id: sale.item_id,
                    quantity: sale.quantity,
                    price: sale.price,
                  })}
                  size={128}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button className="mt-4" onClick={fetchSales}>
        Refresh Receipts
      </Button>
    </div>
  );
};

export default Receipt;
