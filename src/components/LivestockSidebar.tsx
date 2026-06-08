import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp, Building2, PackageCheck, PieChart,
  LineChart, Award, Upload, Globe, Grid3X3,
  Calculator, Banknote, LogOut, Settings, HelpCircle,
  Home, ArrowLeft, Sunrise, FileText,
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

const overviewItems = [
  { title: "Livestock Home",       url: "/on-farm",                    icon: Home },
  { title: "Morning Briefing",     url: "/on-farm/briefing",           icon: Sunrise },
  { title: "Enterprise Overview",  url: "/on-farm/enterprise",         icon: Building2 },
  { title: "Trading Statement",    url: "/on-farm/statement",          icon: FileText },
];

const intelligenceItems = [
  { title: "Market Intelligence",  url: "/on-farm/market",             icon: LineChart },
  { title: "Forecasting",          url: "/on-farm/forecasting",        icon: TrendingUp },
  { title: "Processor Grids",      url: "/on-farm/grids",              icon: Grid3X3 },
  { title: "Kill Results",         url: "/on-farm/kill-results",       icon: Award },
];

const toolsItems = [
  { title: "Bid Calculator",       url: "/on-farm/bid-calculator",     icon: Calculator },
  { title: "Livestock Finance",    url: "/on-farm/finance",            icon: Banknote },
  { title: "Financial Analysis",   url: "/on-farm/financial-analysis", icon: PieChart },
  { title: "Import Financials",    url: "/on-farm/financial-import",   icon: Upload },
];

const complianceItems = [
  { title: "Export Compliance",    url: "/on-farm/export-compliance",  icon: Globe },
  { title: "Export Markets",       url: "/on-farm/enterprise-export",  icon: PackageCheck },
];

const adminItems = [
  { title: "Settings",             url: "/settings",                   icon: Settings },
  { title: "Help Centre",          url: "/help",                       icon: HelpCircle },
];

const ROLE_LABELS: Record<string, string> = {
  ops:        "Kill Floor Ops",
  buyer:      "Field Buyer",
  supplier:   "Supplier",
  transport:  "Transport",
  management: "Management",
};

export function LivestockSidebar() {
  const { state } = useSidebar();
  const { profile, signOut } = useAuth();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <div className="p-3 border-b border-sidebar-border flex items-center gap-2">
          <img src="/muster-logo.png" alt="Muster" className="h-8 w-8 rounded-md object-cover shrink-0" />
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground leading-tight">Muster Livestock</h2>
              <p className="text-[10px] text-muted-foreground">Feedlots · Pastoral · Producers</p>
            </div>
          )}
        </div>

        {[
          { label: "Overview",      items: overviewItems },
          { label: "Intelligence",  items: intelligenceItems },
          { label: "Tools",         items: toolsItems },
          { label: "Compliance",    items: complianceItems },
          { label: "Admin",         items: adminItems },
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

        {/* Switch to Processing */}
        {!collapsed && (
          <div className="px-3 pb-2 mt-2">
            <button
              onClick={() => navigate("/home")}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-sidebar-foreground py-2 px-2 rounded hover:bg-sidebar-accent/50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Switch to Processing
            </button>
          </div>
        )}

        {/* User strip */}
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
