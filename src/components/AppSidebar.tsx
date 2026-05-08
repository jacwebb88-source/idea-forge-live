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
} from "lucide-react";

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
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Kill Plan", url: "/kill-plan", icon: CalendarRange },
  { title: "Forward Volume Plan", url: "/forward-plan", icon: TrendingUp },
  { title: "Booking Board", url: "/bookings", icon: Calendar },
  { title: "Transport Slotting", url: "/transport", icon: Truck },
  { title: "Kill Grid Specifications", url: "/grid-specs", icon: ClipboardList },
  { title: "KPI Dashboard", url: "/kpis", icon: BarChart3 },
  { title: "Compliance Checks", url: "/compliance", icon: ShieldCheck },
  { title: "Kill Reports", url: "/kill-reports", icon: FileText },
  { title: "Change History", url: "/change-history", icon: History },
  { title: "Pilot Projects", url: "/pilots", icon: Lightbulb },
  { title: "Supplier Intake Form", url: "/buyer-request", icon: UserCheck },
];

const dataItems = [
  { title: "Plants", url: "/plants", icon: Users },
  { title: "Suppliers", url: "/suppliers", icon: Users },
  { title: "Import Data", url: "/import", icon: ClipboardList },
];

const systemItems = [
  { title: "Intake Status", url: "/intake", icon: MessageSquare },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
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
          <SidebarGroupLabel>Main</SidebarGroupLabel>
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
          <SidebarGroupLabel>Data Management</SidebarGroupLabel>
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
      </SidebarContent>
    </Sidebar>
  );
}