import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Try sign in first
    const { data: signInData, error: signInErr } =
      await supabase.auth.signInWithPassword({ email, password });

    if (!signInErr && signInData.user) {
      // Existing user — redirect based on role
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .single();
      navigate(profile?.role === "buyer" ? "/buyer-portal" : "/");
      setLoading(false);
      return;
    }

    // Sign in failed — try creating a new account
    if (signInErr?.message === "Invalid login credentials") {
      const { data: signUpData, error: signUpErr } =
        await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: email.split("@")[0], role: "ops" } },
        });

      if (signUpErr) {
        toast({ title: "Could not sign in", description: signUpErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (signUpData.user) {
        // Auto sign-in after signup
        const { data: afterSignup } = await supabase.auth.signInWithPassword({ email, password });
        if (afterSignup.user) {
          navigate("/");
          setLoading(false);
          return;
        }
      }
    }

    toast({ title: "Something went wrong", description: signInErr?.message, variant: "destructive" });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Muster</h1>
          <p className="text-muted-foreground text-sm">
            Livestock processing management
          </p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <ArrowRight className="h-4 w-4 mr-2" />}
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
