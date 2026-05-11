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
  LogOut,
  ShoppingBag,
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

const mainItems = [
  { title: "Kill Board", url: "/kill-plan", icon: CalendarRange },
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Forward Volume Plan", url: "/forward-plan", icon: TrendingUp },
  { title: "Booking Board", url: "/bookings", icon: Calendar },
  { title: "Transport Slotting", url: "/transport", icon: Truck },
  { title: "Kill Grid Specifications", url: "/grid-specs", icon: ClipboardList },
  { title: "Operational KPIs", url: "/kpis", icon: BarChart3 },
  { title: "Compliance Checks", url: "/compliance", icon: ShieldCheck },
  { title: "Kill Reports & Despatch", url: "/kill-reports", icon: FileText },
  { title: "Change History", url: "/change-history", icon: History },
  { title: "Pilot Projects", url: "/pilots", icon: Lightbulb },
  { title: "Supplier Booking Request", url: "/buyer-request", icon: UserCheck },
];

const dataItems = [
  { title: "Plants", url: "/plants", icon: Users },
  { title: "Suppliers", url: "/suppliers", icon: Users },
  { title: "Import Data", url: "/import", icon: ClipboardList },
];

const systemItems = [
  { title: "Intake Status", url: "/intake", icon: MessageSquare },
  { title: "Buyer Portal", url: "/buyer-portal", icon: ShoppingBag },
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
        <div className="p-4 border-b border-sidebar-border">
          {!collapsed && (
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              Muster
            </h2>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Kill Floor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reference Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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