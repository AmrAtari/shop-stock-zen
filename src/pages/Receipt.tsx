import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface ReceiptProps {
  saleId: string;
  items: any[];
  total: number;
  method: string;
}

const ReceiptPrint: React.FC<ReceiptProps> = ({ saleId, items, total, method }) => {
  return (
    <div className="p-4 text-center">
      <h1 className="text-xl font-bold">Store Receipt</h1>
      <p>Invoice: {saleId}</p>
      <p>Payment: {method}</p>
      <table className="w-full text-left text-sm mt-4 border-t border-b">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.quantity}</td>
              <td>${(i.price * i.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="font-bold mt-2">Total: ${total.toFixed(2)}</h2>
      <QRCodeSVG value={saleId} size={100} className="mx-auto mt-2" />
      <p className="text-xs mt-3">Thank you for your purchase!</p>
    </div>
  );
};

export default ReceiptPrint;
