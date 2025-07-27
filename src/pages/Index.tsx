import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ScheduleOverview } from "@/components/dashboard/ScheduleOverview";
import { 
  Users, 
  Calendar, 
  Truck, 
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">
              Managing livestock processing and scheduling efficiently
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-lg font-semibold text-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Animals Processed Today"
            value="87"
            change="+12% from yesterday"
            changeType="positive"
            icon={CheckCircle}
            description="Cattle: 65, Sheep: 22"
          />
          <MetricCard
            title="Active Bookings"
            value="24"
            change="5 pending confirmation"
            changeType="neutral"
            icon={Calendar}
            description="Next 7 days"
          />
          <MetricCard
            title="Transport Arrivals"
            value="8"
            change="2 delayed"
            changeType="negative"
            icon={Truck}
            description="Expected today"
          />
          <MetricCard
            title="Efficiency Rate"
            value="94.2%"
            change="+2.1% this week"
            changeType="positive"
            icon={TrendingUp}
            description="Kill slot utilization"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScheduleOverview />
          <RecentActivity />
        </div>

        {/* Quick Actions & Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-accent p-6 rounded-lg shadow-country">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">Quick Schedule</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Add new booking or modify existing schedule
            </p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-country">
              Manage Schedule
            </button>
          </div>

          <div className="bg-card border border-border p-6 rounded-lg shadow-country">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">Stakeholder Hub</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Connect with buyers, retail partners, and transport
            </p>
            <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-country">
              View Portals
            </button>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h3 className="font-semibold text-foreground">Alerts</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              2 urgent items require attention
            </p>
            <button className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90 transition-country">
              View Alerts
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
