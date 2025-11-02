import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ScheduleOverview } from "@/components/dashboard/ScheduleOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  Truck, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Shield
} from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [complianceOk, setComplianceOk] = useState<number | null>(null);
  const [missingCompliance, setMissingCompliance] = useState<number>(0);
  const [loadingCompliance, setLoadingCompliance] = useState(true);

  useEffect(() => {
    const fetchComplianceData = async () => {
      setLoadingCompliance(true);
      
      const { data, error } = await (supabase as any)
        .from('compliance_checks')
        .select('nvd_status, nlis_status, pic_status');

      if (error) {
        console.error('Error fetching compliance data:', error);
        setComplianceOk(null);
        setMissingCompliance(0);
      } else if (data && data.length > 0) {
        const okCount = data.filter((c: any) => 
          c.nvd_status === 'ok' && 
          c.nlis_status === 'ok' && 
          c.pic_status === 'ok'
        ).length;
        
        const missingCount = data.filter((c: any) => 
          c.nvd_status === 'missing' || 
          c.nlis_status === 'missing' || 
          c.pic_status === 'missing'
        ).length;
        
        setComplianceOk((okCount / data.length) * 100);
        setMissingCompliance(missingCount);
      } else {
        setComplianceOk(null);
        setMissingCompliance(0);
      }
      
      setLoadingCompliance(false);
    };

    fetchComplianceData();
  }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Compliance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard
                title="Compliance OK %"
                value={loadingCompliance ? "Loading..." : complianceOk !== null ? `${complianceOk.toFixed(1)}%` : "No compliance data yet"}
                change={complianceOk !== null ? "Fully compliant bookings" : undefined}
                changeType="neutral"
                icon={Shield}
                description="All three compliance checks passed"
                thresholds={complianceOk !== null ? {
                  value: complianceOk,
                  greenAbove: 95,
                  amberAbove: 80
                } : undefined}
              />
              <MetricCard
                title="Missing Compliance Records"
                value={loadingCompliance ? "Loading..." : missingCompliance === 0 ? "No missing records 🎉" : missingCompliance}
                change={missingCompliance > 0 ? "Requires attention" : "All records complete"}
                changeType={missingCompliance === 0 ? "positive" : "negative"}
                icon={AlertTriangle}
                description="Records with any missing status"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScheduleOverview />
          <RecentActivity />
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
