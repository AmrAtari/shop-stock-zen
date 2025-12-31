import { useState, useMemo } from "react";
import { Star, Gift, ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { POSCustomer } from "./POSCustomerSelector";

interface POSLoyaltyPanelProps {
  customer: POSCustomer | null;
  transactionTotal: number;
  pointsToEarn: number;
  pointsToRedeem: number;
  onRedeemPointsChange: (points: number) => void;
  loyaltySettings: {
    pointsPerDollar: number;
    pointValueInCents: number;
    minRedeemPoints: number;
  };
}

export function POSLoyaltyPanel({
  customer,
  transactionTotal,
  pointsToEarn,
  pointsToRedeem,
  onRedeemPointsChange,
  loyaltySettings,
}: POSLoyaltyPanelProps) {
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);

  if (!customer) return null;

  const availablePoints = customer.loyalty_points || 0;
  const maxRedeemable = Math.min(
    availablePoints,
    Math.floor((transactionTotal * 100) / loyaltySettings.pointValueInCents)
  );
  const redeemValue = (pointsToRedeem * loyaltySettings.pointValueInCents) / 100;

  return (
    <>
      <Card className="border-2 border-yellow-500/20 bg-yellow-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
            <Star className="h-4 w-4" />
            Loyalty Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Available Points</div>
              <div className="text-xl font-bold text-yellow-600">{availablePoints}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Points Earned</div>
              <div className="text-xl font-bold text-green-600">+{pointsToEarn}</div>
            </div>
          </div>

          {availablePoints >= loyaltySettings.minRedeemPoints && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Redeem Points</Label>
                <Badge variant="outline" className="text-xs">
                  {loyaltySettings.pointValueInCents}¢ per point
                </Badge>
              </div>

              {pointsToRedeem > 0 ? (
                <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div>
                    <div className="font-semibold text-green-600">
                      -{pointsToRedeem} points = ${redeemValue.toFixed(2)} off
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRedeemPointsChange(0)}
                    className="text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowRedeemDialog(true)}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Redeem Points (up to {maxRedeemable})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RedeemPointsDialog
        open={showRedeemDialog}
        onOpenChange={setShowRedeemDialog}
        availablePoints={availablePoints}
        maxRedeemable={maxRedeemable}
        pointValueInCents={loyaltySettings.pointValueInCents}
        onConfirm={(points) => {
          onRedeemPointsChange(points);
          setShowRedeemDialog(false);
        }}
      />
    </>
  );
}

// Redeem Points Dialog
interface RedeemPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availablePoints: number;
  maxRedeemable: number;
  pointValueInCents: number;
  onConfirm: (points: number) => void;
}

function RedeemPointsDialog({
  open,
  onOpenChange,
  availablePoints,
  maxRedeemable,
  pointValueInCents,
  onConfirm,
}: RedeemPointsDialogProps) {
  const [points, setPoints] = useState(0);

  const redeemValue = (points * pointValueInCents) / 100;

  const handleQuickSelect = (amount: number) => {
    setPoints(Math.min(amount, maxRedeemable));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-600" />
            Redeem Loyalty Points
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Available Points</span>
            <span className="font-bold text-lg">{availablePoints}</span>
          </div>

          <div className="space-y-2">
            <Label>Points to Redeem</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPoints(Math.max(0, points - 10))}
                disabled={points <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(Math.min(maxRedeemable, Math.max(0, parseInt(e.target.value) || 0)))}
                className="text-center text-lg font-bold"
                min={0}
                max={maxRedeemable}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPoints(Math.min(maxRedeemable, points + 10))}
                disabled={points >= maxRedeemable}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleQuickSelect(50)}>
              50 pts
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickSelect(100)}>
              100 pts
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickSelect(250)}>
              250 pts
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickSelect(maxRedeemable)}>
              Max
            </Button>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Discount Value</span>
              <span className="text-2xl font-bold text-green-600">${redeemValue.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {pointValueInCents}¢ per point × {points} points
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(points)} disabled={points <= 0}>
            Apply {points} Points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to calculate points earned
export function calculatePointsEarned(total: number, pointsPerDollar: number): number {
  return Math.floor(total * pointsPerDollar);
}

// Helper to calculate redemption value
export function calculateRedemptionValue(points: number, pointValueInCents: number): number {
  return (points * pointValueInCents) / 100;
}
