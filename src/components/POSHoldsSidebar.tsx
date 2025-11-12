import { useState } from "react";
import { X, Play, Clock, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CartItem = {
  id: string;
  name: string;
  price: number;
  cartQuantity: number;
  sku: string;
};

type Hold = {
  id: string;
  items: CartItem[];
  timestamp: number;
};

interface POSHoldsSidebarProps {
  holds: Record<string, CartItem[]>;
  onResumeHold: (holdId: string) => void;
  onDeleteHold: (holdId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const POSHoldsSidebar = ({
  holds,
  onResumeHold,
  onDeleteHold,
  isOpen,
  onClose,
}: POSHoldsSidebarProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const holdsList: Hold[] = Object.entries(holds).map(([id, items]) => ({
    id,
    items,
    timestamp: parseInt(id.split("-")[1]) || Date.now(),
  }));

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotal = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-primary/5 border-b border-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Held Transactions</h2>
                <p className="text-sm text-muted-foreground">
                  {holdsList.length} {holdsList.length === 1 ? "hold" : "holds"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {holdsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="bg-muted/50 p-6 rounded-full mb-4">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Holds</h3>
              <p className="text-sm text-muted-foreground text-center">
                Press F2 to hold the current transaction
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {holdsList
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((hold) => (
                  <Card key={hold.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                          Hold #{hold.id.substring(2, 8)}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(hold.timestamp)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-3">
                      {/* Items Preview */}
                      <div className="space-y-2">
                        {hold.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.cartQuantity} × ${item.price.toFixed(2)}
                              </div>
                            </div>
                            <div className="font-semibold text-foreground ml-2">
                              ${(item.price * item.cartQuantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        {hold.items.length > 3 && (
                          <div className="text-xs text-muted-foreground italic">
                            +{hold.items.length - 3} more items
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Total</span>
                        <span className="text-base font-bold text-primary">
                          ${calculateTotal(hold.items).toFixed(2)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => onResumeHold(hold.id)}
                          className="flex-1"
                          size="sm"
                        >
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                          Resume
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirmId(hold.id)}
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with keyboard shortcut hint */}
        {holdsList.length > 0 && (
          <div className="border-t bg-muted/30 p-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-background border border-border rounded font-semibold">
                F2
              </kbd>
              <span>to hold current transaction</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hold?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this held transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteHold(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
