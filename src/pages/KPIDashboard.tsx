import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, FileText } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface KPIData {
  fillRate: number;
  leadTimeVariance: number;
  changesCount: number;
  reworkHours: number;
  slotAdherence: number;
  onSpec: number;
}

interface PlantKPI {
  plant: string;
  plant_id: string;
  fillRate: number;
  leadTimeVariance: number;
  slotAdherence: number;
  onSpec: number;
}

export default function KPIDashboard() {
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [timeRange, setTimeRange] = useState("week");
  const [currentWeekKPIs, setCurrentWeekKPIs] = useState<KPIData | null>(null);
  const [previousWeekKPIs, setPreviousWeekKPIs] = useState<KPIData | null>(null);
  const [plantBreakdown, setPlantBreakdown] = useState<PlantKPI[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate week dates
  const currentWeekStart = startOfWeek(new Date());
  const currentWeekEnd = endOfWeek(new Date());
  const previousWeekStart = startOfWeek(subWeeks(new Date(), 1));
  const previousWeekEnd = endOfWeek(subWeeks(new Date(), 1));

  // Fetch plants
  useEffect(() => {
    const fetchPlants = async () => {
      const { data } = await supabase
        .from('plants')
        .select('*')
        .order('plant_name');
      if (data) setPlants(data);
    };
    fetchPlants();
  }, []);

  // Get Fill Rate from bookings table using SQL AVG
  const calculateFillRate = async (startDate: Date, endDate: Date, plantId?: string) => {
    const { data, error } = await supabase
      .rpc('get_avg_fill_rate' as any, {
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        plant_filter: plantId && plantId !== 'all' ? plantId : null
      });
    
    if (error) {
      console.error('Error fetching fill rate:', error);
      return 0;
    }
    
    return Number(data) || 0;
  };

  // Calculate other KPIs from kpi_records
  const calculateKPIsFromRecords = async (startDate: Date, endDate: Date, plantId?: string) => {
    let query = supabase
      .from('kpi_records')
      .select('*')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));
    
    if (plantId && plantId !== 'all') {
      query = query.eq('plant_id', plantId);
    }

    const { data } = await query;
    
    if (!data || data.length === 0) {
      return {
        leadTimeVariance: 0,
        changesCount: 0,
        reworkHours: 0,
        slotAdherence: 0,
        onSpec: 0,
      };
    }

    const avg = (field: string) => data.reduce((sum, row) => sum + (row[field] || 0), 0) / data.length;
    const sum = (field: string) => data.reduce((sum, row) => sum + (row[field] || 0), 0);

    return {
      leadTimeVariance: avg('lead_time_variance_hr'),
      changesCount: sum('changes_count'),
      reworkHours: sum('rework_hours'),
      slotAdherence: avg('slot_adherence_pct'),
      onSpec: avg('on_spec_pct'),
    };
  };

  // Fetch KPI data
  useEffect(() => {
    const fetchKPIData = async () => {
      setLoading(true);
      
      // Calculate fill rates
      const currentFillRate = await calculateFillRate(currentWeekStart, currentWeekEnd, selectedPlant);
      const previousFillRate = await calculateFillRate(previousWeekStart, previousWeekEnd, selectedPlant);
      
      // Calculate other KPIs
      const currentOtherKPIs = await calculateKPIsFromRecords(currentWeekStart, currentWeekEnd, selectedPlant);
      const previousOtherKPIs = await calculateKPIsFromRecords(previousWeekStart, previousWeekEnd, selectedPlant);

      setCurrentWeekKPIs({
        fillRate: currentFillRate,
        ...currentOtherKPIs,
      });

      setPreviousWeekKPIs({
        fillRate: previousFillRate,
        ...previousOtherKPIs,
      });

      // Calculate plant breakdown if "all" plants selected
      if (selectedPlant === 'all') {
        const breakdown = await Promise.all(
          plants.map(async (plant) => {
            const fillRate = await calculateFillRate(currentWeekStart, currentWeekEnd, plant.id);
            const otherKPIs = await calculateKPIsFromRecords(currentWeekStart, currentWeekEnd, plant.id);
            
            return {
              plant: plant.plant_name,
              plant_id: plant.id,
              fillRate,
              ...otherKPIs,
            };
          })
        );
        setPlantBreakdown(breakdown);
      } else {
        setPlantBreakdown([]);
      }
      
      setLoading(false);
    };

    if (plants.length > 0) {
      fetchKPIData();
    }
  }, [selectedPlant, plants, currentWeekStart, previousWeekStart]);

  const calculateChange = (current: number, previous: number): {
    value: string;
    type: "positive" | "negative" | "neutral";
    symbol: string;
  } => {
    const change = current - previous;
    const changeType: "positive" | "negative" | "neutral" = change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
    return {
      value: Math.abs(change).toFixed(1),
      type: changeType,
      symbol: change > 0 ? "+" : change < 0 ? "-" : "",
    };
  };

  const fillRateChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.fillRate, previousWeekKPIs.fillRate) : 
    { value: "0", type: "neutral" as const, symbol: "" };
  
  const leadTimeChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(previousWeekKPIs.leadTimeVariance, currentWeekKPIs.leadTimeVariance) : // Reversed for better is lower
    { value: "0", type: "neutral" as const, symbol: "" };
  
  const slotAdherenceChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.slotAdherence, previousWeekKPIs.slotAdherence) : 
    { value: "0", type: "neutral" as const, symbol: "" };
  
  const onSpecChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.onSpec, previousWeekKPIs.onSpec) : 
    { value: "0", type: "neutral" as const, symbol: "" };

  if (loading || !currentWeekKPIs) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading KPI data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">KPI Dashboard</h1>
            <p className="text-muted-foreground">Performance metrics and pilot results</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Pilot Report
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export KPIs
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {plants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.plant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Fill Rate"
            value={`${currentWeekKPIs.fillRate.toFixed(1)}%`}
            change={`${fillRateChange.symbol}${fillRateChange.value}pp vs last week`}
            changeType={fillRateChange.type}
            icon={BarChart3}
            description="Booked head ÷ planned head"
          />
          <MetricCard
            title="Lead Time Variance"
            value={`${currentWeekKPIs.leadTimeVariance.toFixed(1)}hr`}
            change={`${leadTimeChange.symbol}${leadTimeChange.value}hr vs last week`}
            changeType={leadTimeChange.type}
            icon={Calendar}
            description="Confirmed vs requested timing"
          />
          <MetricCard
            title="Slot Adherence"
            value={`${currentWeekKPIs.slotAdherence.toFixed(1)}%`}
            change={`${slotAdherenceChange.symbol}${slotAdherenceChange.value}pp vs last week`}
            changeType={slotAdherenceChange.type}
            icon={TrendingUp}
            description="Kept slots / assigned slots"
          />
          <MetricCard
            title="On-Spec Rate"
            value={`${currentWeekKPIs.onSpec.toFixed(1)}%`}
            change={`${onSpecChange.symbol}${onSpecChange.value}pp vs last week`}
            changeType={onSpecChange.type}
            icon={TrendingUp}
            description="Correct grid / total head"
          />
          <MetricCard
            title="Changes Count"
            value={currentWeekKPIs.changesCount}
            change={`${previousWeekKPIs ? (currentWeekKPIs.changesCount - previousWeekKPIs.changesCount) : 0} vs last week`}
            changeType={(previousWeekKPIs && currentWeekKPIs.changesCount < previousWeekKPIs.changesCount ? "positive" : "negative") as "positive" | "negative" | "neutral"}
            icon={Calendar}
            description="Weekly booking changes"
          />
          <MetricCard
            title="Rework Hours"
            value={`${currentWeekKPIs.reworkHours.toFixed(1)}hr`}
            change={`${previousWeekKPIs ? (currentWeekKPIs.reworkHours - previousWeekKPIs.reworkHours).toFixed(1) : 0}hr vs last week`}
            changeType={(previousWeekKPIs && currentWeekKPIs.reworkHours < previousWeekKPIs.reworkHours ? "positive" : "negative") as "positive" | "negative" | "neutral"}
            icon={TrendingDown}
            description="Changes × avg time per change"
          />
        </div>

        {/* Plant Breakdown - Only show when "All Plants" is selected */}
        {selectedPlant === 'all' && plantBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Plant Performance Breakdown - This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Plant</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Fill Rate</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Lead Time Variance</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Slot Adherence</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">On-Spec Rate</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plantBreakdown.map((plant, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-medium">{plant.plant}</td>
                        <td className="py-3 px-2 text-right">{plant.fillRate.toFixed(1)}%</td>
                        <td className="py-3 px-2 text-right">{plant.leadTimeVariance.toFixed(1)}hr</td>
                        <td className="py-3 px-2 text-right">{plant.slotAdherence.toFixed(1)}%</td>
                        <td className="py-3 px-2 text-right">{plant.onSpec.toFixed(1)}%</td>
                        <td className="py-3 px-2 text-right">
                          <Badge 
                            className={
                              plant.fillRate > 90 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : plant.fillRate > 80 
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }
                          >
                            {plant.fillRate > 90 ? "Excellent" : plant.fillRate > 80 ? "Good" : "Needs Improvement"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">📊 Demo Data</p>
              <p>This is sample KPI data for demonstration purposes. Fill Rate now reads from day_plans table with actual calculations.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}