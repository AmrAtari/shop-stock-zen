import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface UserRoleAccess {
  user_id: string;
  role: "admin" | "cashier" | "inventory_man" | "supervisor" | "user";
}

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) throw authError || new Error("Failed to sign in");

      const userId = authData.user.id;

      // **********************************
      // * FIXED SUPABASE QUERY BLOCK *
      // **********************************
      const { data: access, error: accessError } = await supabase
        .from("user_roles")
        .select("role") // Selecting only the 'role' column
        .eq("user_id", userId)
        // Explicitly set the type of the single result to resolve TS errors
        .maybeSingle<Pick<UserRoleAccess, "role">>();

      if (accessError) throw accessError;
      if (!access) {
        toast.error("No role assigned. Contact administrator.");
        await supabase.auth.signOut();
        return;
      }

      navigate("/");
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Package className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold">StockFlow</h1>
          </div>
          <p className="text-muted-foreground">Inventory Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.signIn')}</CardTitle>
            <CardDescription>{t('auth.signInToAccount')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? `${t('common.loading')}` : t('auth.signIn')}
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
