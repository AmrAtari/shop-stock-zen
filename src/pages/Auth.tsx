import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Package, ShoppingCart, Boxes } from "lucide-react";

interface UserRoleAccess {
  user_id: string;
  platform: "POS" | "Inventory";
  role: "admin" | "cashier" | "inventory_man" | "supervisor" | "user";
}

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"POS" | "Inventory" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform) {
      toast.error("Please select a platform first");
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError || !authData.user) throw authError || new Error("Failed to sign in");

      const userId = authData.user.id;

      const { data: access, error: accessError } = await supabase
        .from<UserRoleAccess, UserRoleAccess>("user_roles")
        .select("platform, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (accessError) throw accessError;
      if (!access || access.platform !== selectedPlatform) {
        toast.error(`You do not have access to the ${selectedPlatform} system.`);
        await supabase.auth.signOut();
        return;
      }

      if (selectedPlatform === "POS") navigate("/pos");
      else navigate("/inventory");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedPlatform) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Choose Your Platform</CardTitle>
            <CardDescription>Select which system you want to access</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => setSelectedPlatform("POS")}
              className="flex items-center justify-center gap-2 text-lg py-6"
            >
              <ShoppingCart className="w-6 h-6" /> Point of Sale (POS)
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedPlatform("Inventory")}
              className="flex items-center justify-center gap-2 text-lg py-6"
            >
              <Boxes className="w-6 h-6" /> Inventory System
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Package className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold">StockFlow</h1>
          </div>
          <p className="text-muted-foreground">
            {selectedPlatform === "POS" ? "Point of Sale Access" : "Inventory Management System"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the {selectedPlatform} system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : `Access ${selectedPlatform}`}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Contact your administrator if you need access rights
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
