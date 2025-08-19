import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  Truck, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3
} from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Processor ABC — Today's Schedule</h1>
            <p className="text-muted-foreground mt-1">
              Manage bookings, transport windows and grids without the scramble.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Confirm Slot
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Change Request
            </Button>
            <Button className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Send Grid
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Fill Rate"
            value="87.5%"
            change="+4.3pp from last week"
            changeType="positive"
            icon={BarChart3}
            description="Booking capacity utilization"
          />
          <MetricCard
            title="Lead Time Variance"
            value="4.2hr"
            change="-1.6hr from last week"
            changeType="positive"
            icon={Calendar}
            description="Confirmed vs requested timing"
          />
          <MetricCard
            title="Active Bookings"
            value="156"
            change="+8 from yesterday"
            changeType="positive"
            icon={Calendar}
            description="Confirmed processing slots"
          />
          <MetricCard
            title="Transport Loads"
            value="48"
            change="3 pending"
            changeType="neutral"
            icon={Truck}
            description="Scheduled transport today"
          />
          <MetricCard
            title="Slot Adherence"
            value="92.3%"
            change="+3.6pp from last week"
            changeType="positive"
            icon={TrendingUp}
            description="Kept vs assigned slots"
          />
          <MetricCard
            title="Conflicts"
            value="3"
            change="1 critical"
            changeType="negative"
            icon={AlertTriangle}
            description="Active scheduling conflicts"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">JBS - Dinmore</div>
                    <div className="text-sm text-muted-foreground">Beef: 150 head • 06:00-09:00</div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">Confirmed</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">Teys - Beenleigh</div>
                    <div className="text-sm text-muted-foreground">Lamb: 300 head • 07:00-10:00</div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Requested</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">NH Foods - Oakey</div>
                    <div className="text-sm text-muted-foreground">Beef: 200 head • 05:30-08:30</div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">Changed</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="text-sm font-medium">Booking B001 confirmed</div>
                    <div className="text-xs text-muted-foreground">Murray Valley Livestock • 2 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <div className="text-sm font-medium">Transport slot conflict detected</div>
                    <div className="text-xs text-muted-foreground">Teys - Beenleigh • 15 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="text-sm font-medium">New grid spec published</div>
                    <div className="text-xs text-muted-foreground">Beef v2.1 • 1 hour ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div>
                    <div className="text-sm font-medium">Booking change requested</div>
                    <div className="text-xs text-muted-foreground">Queensland Cattle Co • 2 hours ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
