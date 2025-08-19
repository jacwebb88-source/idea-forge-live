import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ScheduleOverview } from "@/components/dashboard/ScheduleOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

  const handleConfirmSlot = () => {
    toast({
      title: "Booking locked in",
      description: "The booking slot has been confirmed and locked.",
    });
  };

  const handleChangeRequest = () => {
    toast({
      title: "Window updated", 
      description: "The booking window has been successfully updated.",
    });
  };

  const handleSendGrid = () => {
    toast({
      title: "ETA received",
      description: "Grid specifications sent and ETA confirmation received.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Today's Schedule</h1>
            <p className="text-muted-foreground mt-1">
              Manage bookings, transport windows and grids without the scramble.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={handleConfirmSlot}>
              <CheckCircle className="h-4 w-4" />
              Confirm Slot
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={handleChangeRequest}>
              <Calendar className="h-4 w-4" />
              Change Request
            </Button>
            <Button className="flex items-center gap-2" onClick={handleSendGrid}>
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
          <ScheduleOverview />
          
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


        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">🏭 Demo Data</p>
              <p>This is sample dashboard data for demonstration. Production would show real processor metrics, live activity feeds, and actual plant performance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
