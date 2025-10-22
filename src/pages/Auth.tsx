import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Package } from "lucide-react"; // Only keeping Package icon as others were unused

// The UserRoleAccess interface is still useful for type safety
interface UserRoleAccess {
  user_id: string;
  role: "admin" | "cashier" | "inventory_man" | "supervisor" | "user";
}

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Removed [isSignUp, setIsSignUp] state

  useEffect(() => {
    // Check for an existing session and redirect if found
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Sign In with password (using Supabase's signInWithPassword)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle sign-in errors or missing user data
      if (authError || !authData.user) throw authError || new Error("Failed to sign in");

      const userId = authData.user.id;

      // 2. Fetch User Role from the 'user_roles' table
      const { data: access, error: accessError } = await supabase
        .from<UserRoleAccess>("user_roles") // Use <UserRoleAccess> for better type inference
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      // Handle role fetch errors
      if (accessError) throw accessError;

      // 3. Check if a role is assigned
      if (!access) {
        toast.error("No role assigned. Contact administrator.");
        await supabase.auth.signOut(); // Log out the user since they can't access
        return;
      }

      // If sign-in is successful and role is confirmed, navigate to the main page
      navigate("/");
    } catch (error: any) {
      // Display a generic sign-in failure toast
      toast.error(error.message || `Failed to sign in`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
            {/* Title is now fixed to Sign In */}
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Use the new handleSignIn function */}
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
                {/* Button text is now fixed to Sign In */}
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            {/* Removed the 'Sign up' button/link */}
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
