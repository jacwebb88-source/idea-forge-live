import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Users, Plus, CheckCircle, XCircle, Clock,
  Eye, EyeOff, ShieldCheck, Copy, Mail,
} from "lucide-react";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  last_seen_at: string | null;
  created_at: string;
  is_active: boolean;
};

const ROLE_META: Record<UserRole, { label: string; cls: string }> = {
  ops:        { label: "Kill Floor Ops",   cls: "bg-blue-100 text-blue-800 border-blue-200" },
  buyer:      { label: "Field Buyer",      cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  supplier:   { label: "Supplier",         cls: "bg-amber-100 text-amber-800 border-amber-200" },
  transport:  { label: "Transport",        cls: "bg-purple-100 text-purple-800 border-purple-200" },
  management: { label: "Management",       cls: "bg-slate-100 text-slate-800 border-slate-200" },
};

const DEMO_LINK = typeof window !== "undefined" ? window.location.origin : "";

export default function UserAccess() {
  const { profile: myProfile } = useAuth();
  const { toast } = useToast();

  const [users, setUsers]           = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving]         = useState(false);

  // New user form
  const [newEmail, setNewEmail]           = useState("");
  const [newName, setNewName]             = useState("");
  const [newRole, setNewRole]             = useState<UserRole>("ops");
  const [newPassword, setNewPassword]     = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [createdCreds, setCreatedCreds]   = useState<{ email: string; password: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("id, email, display_name, role, last_seen_at, created_at, is_active")
      .order("created_at", { ascending: false });
    setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || newPassword.length < 8) {
      toast({ title: "Email and password (min 8 chars) required", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Sign up via Supabase Auth (with role in metadata so the trigger picks it up)
    const { data, error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: {
        data: { display_name: newName, role: newRole },
      },
    });

    if (error) {
      toast({ title: "Failed to create account", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Account created", description: `${newEmail} can now log in` });
    setCreatedCreds({ email: newEmail, password: newPassword });
    setNewEmail(""); setNewName(""); setNewPassword("");
    fetchUsers();
    setSaving(false);
  };

  const toggleActive = async (user: UserRow) => {
    const { error } = await supabase
      .from("user_profiles")
      .update({ is_active: !user.is_active })
      .eq("id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: user.is_active ? "Account deactivated" : "Account reactivated" });
      fetchUsers();
    }
  };

  const changeRole = async (userId: string, role: UserRole) => {
    await supabase.from("user_profiles").update({ role }).eq("id", userId);
    fetchUsers();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const copyLoginDetails = () => {
    if (!createdCreds) return;
    const text = `Muster login details\n\nURL: ${DEMO_LINK}\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}`;
    copyToClipboard(text);
  };

  const activeCount  = users.filter(u => u.is_active).length;
  const recentCount  = users.filter(u => u.last_seen_at).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users & Access</h1>
            <p className="text-muted-foreground mt-1">
              Manage who has access to Muster — create accounts, assign roles, track activity
            </p>
          </div>
          <Button onClick={() => { setCreatedCreds(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add user
          </Button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active accounts", value: activeCount, icon: Users, cls: "text-blue-600" },
            { label: "Have logged in",  value: recentCount, icon: CheckCircle, cls: "text-emerald-600" },
            { label: "Never logged in", value: activeCount - recentCount, icon: Clock, cls: "text-amber-600" },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <m.icon className={`h-5 w-5 shrink-0 ${m.cls}`} />
                <div>
                  <p className="text-2xl font-bold">{loading ? "—" : m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              All accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <p className="text-sm text-muted-foreground animate-pulse px-6 py-4">Loading users…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">No accounts yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Name / Email</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Last active</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const roleMeta = ROLE_META[u.role] ?? { label: u.role, cls: "bg-muted text-muted-foreground border-border" };
                    const isMe = u.id === myProfile?.id;
                    return (
                      <tr key={u.id} className={`border-b border-border/50 ${!u.is_active ? "opacity-50" : ""}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {((u.display_name ?? u.email ?? "?")[0]).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {u.display_name ?? "—"}
                                {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isMe ? (
                            <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${roleMeta.cls}`}>
                              {roleMeta.label}
                            </span>
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={v => changeRole(u.id, v as UserRole)}
                            >
                              <SelectTrigger className="h-7 text-xs w-40 border-0 bg-transparent p-0 focus:ring-0">
                                <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${roleMeta.cls}`}>
                                  {roleMeta.label}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(([val, meta]) => (
                                  <SelectItem key={val} value={val}>{meta.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {u.last_seen_at ? (
                            <span className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              {formatDistanceToNow(parseISO(u.last_seen_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-600">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              Never logged in
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${
                            u.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {u.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isMe && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => toggleActive(u)}
                            >
                              {u.is_active
                                ? <><XCircle className="h-3.5 w-3.5 mr-1 text-red-500" />Deactivate</>
                                : <><CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" />Reactivate</>
                              }
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create user dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setCreatedCreds(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              {createdCreds ? "Account created" : "Create new account"}
            </DialogTitle>
          </DialogHeader>

          {createdCreds ? (
            /* ── Success state — show credentials to copy ── */
            <div className="space-y-4 pt-1">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Account ready — share these login details
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between bg-white rounded border px-3 py-2">
                    <span className="text-muted-foreground text-xs">URL</span>
                    <span className="font-mono text-xs">{DEMO_LINK}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded border px-3 py-2">
                    <span className="text-muted-foreground text-xs">Email</span>
                    <span className="font-mono text-xs">{createdCreds.email}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded border px-3 py-2">
                    <span className="text-muted-foreground text-xs">Password</span>
                    <span className="font-mono text-xs">{createdCreds.password}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={copyLoginDetails}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy all details
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setCreatedCreds(null)}>
                  Create another
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Paste these into your email — the user can change their password after first login
              </p>
            </div>
          ) : (
            /* ── Create form ── */
            <form onSubmit={handleCreateUser} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="newName">Full name</Label>
                <Input
                  id="newName"
                  placeholder="e.g. Dave McKenzie"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newEmail">Email address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="dave@acrabattoir.com.au"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={v => setNewRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(([val, meta]) => (
                      <SelectItem key={val} value={val}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Temporary password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(p => !p)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">You'll copy this to share with them — they can change it later</p>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Creating…" : "Create account"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
