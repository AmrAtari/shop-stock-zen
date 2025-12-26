import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCcw, ArrowRightLeft, Trash2, DollarSign, Globe } from "lucide-react";
import { 
  useCurrencies, 
  useExchangeRates, 
  useCreateCurrency, 
  useCreateExchangeRate,
  useDeleteExchangeRate,
  convertCurrency 
} from "@/hooks/useMultiCurrency";
import { toast } from "sonner";
import { format } from "date-fns";

const MultiCurrency = () => {
  const [showNewCurrencyDialog, setShowNewCurrencyDialog] = useState(false);
  const [showNewRateDialog, setShowNewRateDialog] = useState(false);
  const [showConverterDialog, setShowConverterDialog] = useState(false);
  
  const [newCurrency, setNewCurrency] = useState({ name: "" });
  const [newRate, setNewRate] = useState({
    from_currency_id: "",
    to_currency_id: "",
    rate: 1,
    effective_date: new Date().toISOString().split("T")[0],
    source: "manual",
  });
  const [converterState, setConverterState] = useState({
    amount: 100,
    fromCurrency: "",
    toCurrency: "",
  });

  const { data: currencies = [], isLoading: currenciesLoading } = useCurrencies();
  const { data: exchangeRates = [], isLoading: ratesLoading } = useExchangeRates();
  const createCurrency = useCreateCurrency();
  const createRate = useCreateExchangeRate();
  const deleteRate = useDeleteExchangeRate();

  const handleCreateCurrency = async () => {
    try {
      await createCurrency.mutateAsync({ name: newCurrency.name });
      setShowNewCurrencyDialog(false);
      setNewCurrency({ name: "" });
      toast.success("Currency created successfully");
    } catch (error) {
      toast.error("Failed to create currency");
    }
  };

  const handleCreateRate = async () => {
    try {
      await createRate.mutateAsync(newRate);
      setShowNewRateDialog(false);
      setNewRate({
        from_currency_id: "",
        to_currency_id: "",
        rate: 1,
        effective_date: new Date().toISOString().split("T")[0],
        source: "manual",
      });
      toast.success("Exchange rate added successfully");
    } catch (error) {
      toast.error("Failed to add exchange rate");
    }
  };

  const handleDeleteRate = async (id: string) => {
    try {
      await deleteRate.mutateAsync(id);
      toast.success("Exchange rate deleted");
    } catch (error) {
      toast.error("Failed to delete exchange rate");
    }
  };

  const getCurrencyName = (id: string) => {
    return currencies.find((c) => c.id === id)?.name || id;
  };

  // Find the rate for converter
  const getConversionRate = () => {
    if (!converterState.fromCurrency || !converterState.toCurrency) return null;
    const rate = exchangeRates.find(
      (r) =>
        r.from_currency_id === converterState.fromCurrency &&
        r.to_currency_id === converterState.toCurrency
    );
    return rate?.rate || null;
  };

  const conversionRate = getConversionRate();
  const convertedAmount = convertCurrency(converterState.amount, conversionRate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Multi-Currency Management</h1>
          <p className="text-muted-foreground mt-1">Manage currencies and exchange rates</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showConverterDialog} onOpenChange={setShowConverterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Currency Converter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Currency Converter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={converterState.amount}
                    onChange={(e) =>
                      setConverterState({ ...converterState, amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From Currency</Label>
                    <Select
                      value={converterState.fromCurrency}
                      onValueChange={(value) => setConverterState({ ...converterState, fromCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>To Currency</Label>
                    <Select
                      value={converterState.toCurrency}
                      onValueChange={(value) => setConverterState({ ...converterState, toCurrency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {converterState.fromCurrency && converterState.toCurrency && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      {conversionRate ? (
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            {converterState.amount} {getCurrencyName(converterState.fromCurrency)} =
                          </p>
                          <p className="text-3xl font-bold text-foreground mt-2">
                            {convertedAmount?.toFixed(2)} {getCurrencyName(converterState.toCurrency)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Rate: 1 {getCurrencyName(converterState.fromCurrency)} = {conversionRate}{" "}
                            {getCurrencyName(converterState.toCurrency)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground">
                          No exchange rate found for this currency pair
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewCurrencyDialog} onOpenChange={setShowNewCurrencyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Currency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Currency</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Currency Code/Name</Label>
                  <Input
                    value={newCurrency.name}
                    onChange={(e) => setNewCurrency({ name: e.target.value })}
                    placeholder="e.g., USD, EUR, GBP"
                  />
                </div>
                <Button onClick={handleCreateCurrency} disabled={createCurrency.isPending} className="w-full">
                  {createCurrency.isPending ? "Creating..." : "Add Currency"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="currencies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="currencies" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Currencies
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Exchange Rates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="currencies">
          <Card>
            <CardHeader>
              <CardTitle>Available Currencies</CardTitle>
            </CardHeader>
            <CardContent>
              {currenciesLoading ? (
                <p className="text-muted-foreground">Loading currencies...</p>
              ) : currencies.length === 0 ? (
                <p className="text-muted-foreground">No currencies configured. Add currencies to get started.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {currencies.map((currency) => (
                    <Card key={currency.id} className="bg-muted/30">
                      <CardContent className="pt-4 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{currency.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {format(new Date(currency.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Exchange Rates</CardTitle>
              <Dialog open={showNewRateDialog} onOpenChange={setShowNewRateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Exchange Rate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>From Currency</Label>
                        <Select
                          value={newRate.from_currency_id}
                          onValueChange={(value) => setNewRate({ ...newRate, from_currency_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency.id} value={currency.id}>
                                {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>To Currency</Label>
                        <Select
                          value={newRate.to_currency_id}
                          onValueChange={(value) => setNewRate({ ...newRate, to_currency_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency.id} value={currency.id}>
                                {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Exchange Rate</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={newRate.rate}
                        onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Effective Date</Label>
                      <Input
                        type="date"
                        value={newRate.effective_date}
                        onChange={(e) => setNewRate({ ...newRate, effective_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select
                        value={newRate.source}
                        onValueChange={(value) => setNewRate({ ...newRate, source: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                          <SelectItem value="api">API Feed</SelectItem>
                          <SelectItem value="bank">Bank Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateRate} disabled={createRate.isPending} className="w-full">
                      {createRate.isPending ? "Adding..." : "Add Exchange Rate"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <p className="text-muted-foreground">Loading exchange rates...</p>
              ) : exchangeRates.length === 0 ? (
                <p className="text-muted-foreground">No exchange rates found. Add rates to enable currency conversion.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {getCurrencyName(rate.from_currency_id || "")}
                        </TableCell>
                        <TableCell>{getCurrencyName(rate.to_currency_id || "")}</TableCell>
                        <TableCell className="text-right font-mono">{rate.rate.toFixed(4)}</TableCell>
                        <TableCell>{format(new Date(rate.effective_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rate.source || "manual"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRate(rate.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MultiCurrency;
