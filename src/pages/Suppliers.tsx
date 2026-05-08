import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Phone, Mail, CreditCard, Calendar, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  abn: string | null;
  type: string | null;
  // enriched
  activeBookings?: number;
  totalHead?: number;
};

const supplierTypeLabel = (t: string | null): string => {
  const map: Record<string, string> = {
    producer:  "Producer",
    agent:     "Agent / Broker",
    feedlot:   "Feedlot",
    importer:  "Importer",
  };
  return t ? (map[t] || t) : "Unknown";
};

const typeColour = (t: string | null): string => {
  switch (t) {
    case "producer":  return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "agent":     return "bg-blue-50 text-blue-700 border-blue-200";
    case "feedlot":   return "bg-amber-50 text-amber-700 border-amber-200";
    case "importer":  return "bg-purple-50 text-purple-700 border-purple-200";
    default:          return "bg-muted text-muted-foreground border-border";
  }
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);

      const { data: supData } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (!supData) { setLoading(false); return; }

      const ids = supData.map(s => s.id);

      // Fetch booking counts per supplier
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("supplier_id, head_count, status")
        .in("supplier_id", ids)
        .neq("status", "cancelled");

      const bookingMap: Record<string, { count: number; head: number }> = {};
      (bookingData || []).forEach((b: any) => {
        if (!b.supplier_id) return;
        if (!bookingMap[b.supplier_id]) bookingMap[b.supplier_id] = { count: 0, head: 0 };
        bookingMap[b.supplier_id].count += 1;
        bookingMap[b.supplier_id].head += b.head_count || 0;
      });

      setSuppliers(supData.map((s: any) => ({
        ...s,
        activeBookings: bookingMap[s.id]?.count ?? 0,
        totalHead: bookingMap[s.id]?.head ?? 0,
      })));
      setLoading(false);
    };
    fetchSuppliers();
  }, []);

  const uniqueTypes = Array.from(new Set(suppliers.map(s => s.type).filter(Boolean))) as string[];

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.name.toLowerCase().includes(q) ||
      (s.contact_name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.abn || "").includes(q);
    const matchType = typeFilter === "all" || s.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalActiveBookings = suppliers.reduce((sum, s) => sum + (s.activeBookings || 0), 0);
  const totalHead = suppliers.reduce((sum, s) => sum + (s.totalHead || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suppliers</h1>
            <p className="text-muted-foreground">
              Manage producer, agent, and feedlot supplier records
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Summary strip */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Total suppliers</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{suppliers.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Active bookings</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalActiveBookings}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Total head on book</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalHead.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Avg head / supplier</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {suppliers.length > 0 ? Math.round(totalHead / suppliers.length).toLocaleString() : "—"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, contact, email, ABN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All types</SelectItem>
              {uniqueTypes.map(t => (
                <SelectItem key={t} value={t}>{supplierTypeLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Supplier cards */}
        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading suppliers…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No suppliers found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-tight truncate">{s.name}</CardTitle>
                      {s.contact_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{s.contact_name}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs font-medium border rounded-full px-2 py-0.5 ${typeColour(s.type)}`}>
                      {supplierTypeLabel(s.type)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {/* Contact info */}
                  <div className="space-y-1">
                    {s.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <a href={`mailto:${s.email}`} className="truncate hover:text-foreground transition-colors">
                          {s.email}
                        </a>
                      </div>
                    )}
                    {s.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <a href={`tel:${s.phone}`} className="hover:text-foreground transition-colors">
                          {s.phone}
                        </a>
                      </div>
                    )}
                    {s.abn && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="h-3 w-3 shrink-0" />
                        <span>ABN {s.abn}</span>
                      </div>
                    )}
                  </div>

                  {/* Booking stats */}
                  <div className="pt-2 border-t border-border flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">
                        <span className="font-semibold text-foreground">{s.activeBookings}</span>
                        {" "}booking{s.activeBookings !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {(s.totalHead || 0) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs">
                          <span className="font-semibold text-foreground">{(s.totalHead || 0).toLocaleString()}</span>
                          {" "}head
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
