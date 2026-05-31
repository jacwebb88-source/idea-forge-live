import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  Users,
  Truck,
  MessageSquare,
  Settings,
  Home,
  ClipboardList,
  PieChart,
  UserCheck,
  Lightbulb,
  ShieldCheck,
  CalendarRange,
  FileText,
  History,
  TrendingUp,
  Building2,
  LogOut,
  ShoppingBag,
  UserCog,
  Leaf,
  Calculator,
  Grid3X3,
  LineChart,
  Banknote,
  Presentation,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// ─── Sidebar nav groups ──────────────────────────────────────────────────────

const overviewItems = [
  { title: "Dashboard", url: "/home", icon: Home },
  { title: "Kill Board", url: "/kill-plan", icon: CalendarRange },
  { title: "Operational KPIs", url: "/kpis", icon: BarChart3 },
];

const operationsItems = [
  { title: "Booking Board", url: "/bookings", icon: Calendar },
  { title: "Forward Volume Plan", url: "/forward-plan", icon: TrendingUp },
  { title: "Transport Slotting", url: "/transport", icon: Truck },
  { title: "Intake Status", url: "/intake", icon: MessageSquare },
  { title: "Kill Grid Specs", url: "/grid-specs", icon: ClipboardList },
];

const reportingItems = [
  { title: "Kill Reports", url: "/kill-reports", icon: FileText },
  { title: "Compliance", url: "/compliance", icon: ShieldCheck },
  { title: "Change History", url: "/change-history", icon: History },
];

const relationshipsItems = [
  { title: "Suppliers", url: "/suppliers", icon: Users },
  { title: "Plants", url: "/plants", icon: Building2 },
  { title: "Buyer Portal", url: "/buyer-portal", icon: ShoppingBag },
  { title: "Supplier Portal", url: "/supplier-portal", icon: Leaf },
  { title: "Booking Request", url: "/buyer-request", icon: UserCheck },
];

const onFarmItems = [
  { title: "On Farm Home", url: "/on-farm", icon: TrendingUp },
  { title: "Market Intelligence", url: "/on-farm/market", icon: LineChart },
  { title: "Processor Grids", url: "/on-farm/grids", icon: Grid3X3 },
  { title: "Bid Calculator", url: "/on-farm/bid-calculator", icon: Calculator },
  { title: "Livestock Finance", url: "/on-farm/finance", icon: Banknote },
];

const enterpriseItems = [
  { title: "Enterprise Overview", url: "/on-farm/enterprise", icon: Building2 },
];

const adminItems = [
  { title: "Import Data", url: "/import", icon: ClipboardList },
  { title: "Pilot Projects", url: "/pilots", icon: Lightbulb },
  { title: "Platform Overview", url: "/on-farm/pitch", icon: Presentation },
  { title: "Users & Access", url: "/users", icon: UserCog },
  { title: "Settings", url: "/settings", icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  ops:        "Kill Floor Ops",
  buyer:      "Field Buyer",
  supplier:   "Supplier",
  transport:  "Transport",
  management: "Management",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <div className="p-3 border-b border-sidebar-border flex items-center gap-2">
          <img src="/muster-logo.png" alt="Muster" className="h-8 w-8 rounded-md object-cover shrink-0" />
          {!collapsed && (
            <h2 className="text-lg font-semibold text-sidebar-foreground">Muster</h2>
          )}
        </div>

        {[
          { label: "Overview",      items: overviewItems },
          { label: "Operations",    items: operationsItems },
          { label: "Reporting",     items: reportingItems },
          { label: "Relationships", items: relationshipsItems },
          { label: "🌿 On Farm",         items: onFarmItems },
          { label: "🏢 Livestock Enterprise", items: enterpriseItems },
          { label: "Admin",              items: adminItems },
        ].map(({ label, items }) => (
          <SidebarGroup key={label}>
            <SidebarGroupLabel className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/70 px-3 py-1">
              {label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* User strip at bottom */}
        {profile && (
          <div className="mt-auto border-t border-sidebar-border p-3">
            {collapsed ? (
              <button
                onClick={signOut}
                className="w-full flex justify-center p-1 rounded hover:bg-sidebar-accent/50 text-sidebar-foreground"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {(profile.display_name ?? profile.email ?? "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">
                    {profile.display_name ?? profile.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="shrink-0 p-1 rounded hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}