import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus } from "lucide-react";

export default function Login() {
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [mode, setMode]         = useState<"login" | "signup">("signup");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (data.user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      const role = profile?.role ?? "ops";
      navigate(role === "buyer" ? "/buyer-portal" : "/");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name || email.split("@")[0], role: "ops" },
      },
    });
    if (error) {
      // If user already exists, prompt them to log in instead
      if (error.message.toLowerCase().includes("already registered")) {
        toast({
          title: "Account already exists",
          description: "Head to Sign in and use your password.",
        });
        setMode("login");
      } else {
        toast({ title: "Sign-up failed", description: error.message, variant: "destructive" });
      }
      setLoading(false);
      return;
    }
    // Auto sign-in after signup (works when email confirmation is disabled)
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInErr && data.user) {
      navigate("/");
    } else {
      // Email confirmation still on — tell them to confirm
      toast({
        title: "Almost there",
        description: "Check your inbox for a confirmation email, then sign in.",
      });
      setMode("login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Muster</h1>
          <p className="text-muted-foreground text-sm">
            Kill floor management — built for Australian processors
          </p>
        </div>

        <Card className="shadow-lg">
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            {(["signup", "login"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  mode === m
                    ? "text-foreground border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>

          <CardContent className="pt-5 pb-6">
            {mode === "signup" ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Dave McKenzie"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <UserPlus className="h-4 w-4 mr-2" />}
                  Get started
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No credit card required — this is a demo
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-login">Password</Label>
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <LogIn className="h-4 w-4 mr-2" />}
                  Sign in
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Muster · Australian livestock processing management
        </p>
      </div>
    </div>
  );
}
