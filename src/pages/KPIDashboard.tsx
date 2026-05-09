import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, FileText, Target, Clock, Truck } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks, addDays, addWeeks } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface KPIData {
  fillRate: number;
  leadTimeVariance: number;
  changesCount: number;
  reworkHours: number;
  slotAdherence: number;
  onSpec: number;
  gridFitScore: number;
  varianceHours: number;
  transportConfirmed: number;
  hasGridScoreData: boolean;
  loadsPending: number;
  complianceRate: number;
  complianceOk: number;
  missingCompliance: number;
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
  const [selectedProcessor, setSelectedProcessor] = useState("all");
  const [timeRange, setTimeRange] = useState("week");
  const [currentWeekKPIs, setCurrentWeekKPIs] = useState<KPIData | null>(null);
  const [previousWeekKPIs, setPreviousWeekKPIs] = useState<KPIData | null>(null);
  const [plantBreakdown, setPlantBreakdown] = useState<PlantKPI[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [processors, setProcessors] = useState<string[]>([]);
  const [plantsLoaded, setPlantsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dailyChartData, setDailyChartData] = useState<any[]>([]);
  const [weeklyTrendData, setWeeklyTrendData] = useState<any[]>([]);

  // Calculate week dates — memoised so they don't recreate on every render
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const currentWeekEnd = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const previousWeekStart = useMemo(() => startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), []);
  const previousWeekEnd = useMemo(() => endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), []);

  // Fetch plants and processors
  useEffect(() => {
    const fetchPlants = async () => {
      const { data } = await supabase
        .from('plants')
        .select('*')
        .order('plant_name');
      if (data) {
        setPlants(data);
        // Extract unique processors
        const uniqueProcessors = [...new Set(data.map(p => p.company_name).filter(Boolean))] as string[];
        setProcessors(uniqueProcessors);
      }
      setPlantsLoaded(true); // always mark done, even if no plants
    };
    fetchPlants();
  }, []);

  // Reset plant selection when processor changes
  useEffect(() => {
    setSelectedPlant("all");
  }, [selectedProcessor]);

  // Filter plants based on selected processor
  const filteredPlants = selectedProcessor === "all" 
    ? plants 
    : plants.filter(p => p.company_name === selectedProcessor);

  // Get plant IDs for the current filter
  const getFilteredPlantIds = () => {
    if (selectedPlant !== "all") {
      return [selectedPlant];
    }
    if (selectedProcessor !== "all") {
      return filteredPlants.map(p => p.id);
    }
    return plants.map(p => p.id);
  };

  // Get Fill Rate from bookings table using SQL AVG
  const calculateFillRate = async (startDate: Date, endDate: Date, plantIds?: string[]) => {
    if (!plantIds || plantIds.length === 0) return 0;

    // If multiple plants, calculate average across all
    if (plantIds.length > 1) {
      const results = await Promise.all(
        plantIds.map(plantId => 
          supabase.rpc('get_avg_fill_rate' as any, {
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            plant_filter: plantId
          })
        )
      );
      const validResults = results.filter(r => !r.error).map(r => Number(r.data) || 0);
      return validResults.length > 0 ? validResults.reduce((a, b) => a + b, 0) / validResults.length : 0;
    }

    // Single plant
    const { data, error } = await supabase
      .rpc('get_avg_fill_rate' as any, {
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        plant_filter: plantIds[0]
      });
    
    if (error) {
      console.error('Error fetching fill rate:', error);
      return 0;
    }
    
    return Number(data) || 0;
  };

  // Calculate bookings-based KPIs
  const calculateBookingsKPIs = async (startDate: Date, endDate: Date, plantIds?: string[]) => {
    if (!plantIds || plantIds.length === 0) {
      return { gridFitScore: 0, varianceHours: 0, transportConfirmed: 0, hasGridScoreData: false, loadsPending: 0 };
    }

    let query = supabase
      .from('bookings')
      .select('*')
      .gte('requested_kill_date', format(startDate, 'yyyy-MM-dd'))
      .lte('requested_kill_date', format(endDate, 'yyyy-MM-dd'));
    
    if (plantIds.length === 1) {
      query = query.eq('plant_id', plantIds[0]);
    } else {
      query = query.in('plant_id', plantIds);
    }

    const { data } = await query;
    
    if (!data || data.length === 0) {
      return {
        gridFitScore: 0,
        varianceHours: 0,
        transportConfirmed: 0,
        hasGridScoreData: false,
        loadsPending: 0,
      };
    }

    const validGridScores = data.filter(row => (row as any).grid_fit_score != null);
    const hasGridScoreData = validGridScores.length > 0;
    const avgGridFit = hasGridScoreData 
      ? validGridScores.reduce((sum, row) => sum + ((row as any).grid_fit_score || 0), 0) / validGridScores.length 
      : 0;
    const avgVariance = data.reduce((sum, row) => sum + ((row as any).variance_hours || 0), 0) / data.length;
    const confirmedCount = data.filter(row => (row as any).transport_status === 'confirmed').length;
    const transportConfirmedPct = data.length > 0 ? (confirmedCount / data.length) * 100 : 0;
    const pendingCount = data.filter(row => (row as any).transport_status === 'pending').length;

    return {
      gridFitScore: avgGridFit,
      varianceHours: avgVariance,
      transportConfirmed: transportConfirmedPct,
      hasGridScoreData,
      loadsPending: pendingCount,
    };
  };

  // Calculate compliance rate from compliance_checks
  const calculateComplianceRate = async (startDate: Date, endDate: Date, plantIds?: string[]) => {
    if (!plantIds || plantIds.length === 0) return 0;

    // Get all bookings in the date range
    let bookingsQuery = supabase
      .from('bookings')
      .select('id')
      .gte('requested_kill_date', format(startDate, 'yyyy-MM-dd'))
      .lte('requested_kill_date', format(endDate, 'yyyy-MM-dd'));
    
    if (plantIds.length === 1) {
      bookingsQuery = bookingsQuery.eq('plant_id', plantIds[0]);
    } else {
      bookingsQuery = bookingsQuery.in('plant_id', plantIds);
    }

    const { data: bookings } = await bookingsQuery;
    if (!bookings || bookings.length === 0) return 0;

    const bookingIds = bookings.map(b => b.id);

    // Get compliance checks for these bookings
    const { data: complianceData } = await (supabase as any)
      .from('compliance_checks')
      .select('nvd_status, nlis_status, pic_status, booking_id')
      .in('booking_id', bookingIds);

    if (!complianceData || complianceData.length === 0) return 0;

    // Count how many have all three statuses = 'complete'
    const completeCount = complianceData.filter((c: any) => 
      c.nvd_status === 'complete' && 
      c.nlis_status === 'complete' && 
      c.pic_status === 'complete'
    ).length;

    return (completeCount / complianceData.length) * 100;
  };

  // Calculate compliance OK from compliance_checks
  const calculateComplianceOk = async (startDate: Date, endDate: Date, plantIds?: string[]) => {
    if (!plantIds || plantIds.length === 0) return 0;

    // Get all compliance checks
    const { data: complianceData } = await (supabase as any)
      .from('compliance_checks')
      .select('nvd_status, nlis_status, pic_status');

    if (!complianceData || complianceData.length === 0) return 0;

    // Count how many have all three statuses = 'ok'
    const okCount = complianceData.filter((c: any) => 
      c.nvd_status === 'ok' && 
      c.nlis_status === 'ok' && 
      c.pic_status === 'ok'
    ).length;

    return (okCount / complianceData.length) * 100;
  };

  // Calculate missing compliance records from compliance_checks
  const calculateMissingCompliance = async (startDate: Date, endDate: Date, plantIds?: string[]) => {
    if (!plantIds || plantIds.length === 0) return 0;

    // Get all compliance checks
    const { data: complianceData } = await (supabase as any)
      .from('compliance_checks')
      .select('nvd_status, nlis_status, pic_status');

    if (!complianceData || complianceData.length === 0) return 0;

    // Count how many have any status = 'missing'
    const missingCount = complianceData.filter((c: any) => 
      c.nvd_status === 'missing' || 
      c.nlis_status === 'missing' || 
      c.pic_status === 'missing'
    ).length;

    return missingCount;
  };

  // Calculate other KPIs from kpi_records
  const calculateKPIsFromRecords = async (startDate: Date, endDate: Date, plantIds?: string[]) => {
    if (!plantIds || plantIds.length === 0) {
      return { leadTimeVariance: 0, changesCount: 0, reworkHours: 0, slotAdherence: 0, onSpec: 0 };
    }

    let query = supabase
      .from('kpi_records')
      .select('*')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));
    
    if (plantIds.length === 1) {
      query = query.eq('plant_id', plantIds[0]);
    } else {
      query = query.in('plant_id', plantIds);
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
      
      const plantIds = getFilteredPlantIds();
      
      // Calculate fill rates
      const currentFillRate = await calculateFillRate(currentWeekStart, currentWeekEnd, plantIds);
      const previousFillRate = await calculateFillRate(previousWeekStart, previousWeekEnd, plantIds);
      
      // Calculate bookings KPIs
      const currentBookingsKPIs = await calculateBookingsKPIs(currentWeekStart, currentWeekEnd, plantIds);
      const previousBookingsKPIs = await calculateBookingsKPIs(previousWeekStart, previousWeekEnd, plantIds);
      
      // Calculate other KPIs
      const currentOtherKPIs = await calculateKPIsFromRecords(currentWeekStart, currentWeekEnd, plantIds);
      const previousOtherKPIs = await calculateKPIsFromRecords(previousWeekStart, previousWeekEnd, plantIds);
      
      // Calculate compliance rates
      const currentCompliance = await calculateComplianceRate(currentWeekStart, currentWeekEnd, plantIds);
      const previousCompliance = await calculateComplianceRate(previousWeekStart, previousWeekEnd, plantIds);
      
      // Calculate compliance OK
      const currentComplianceOk = await calculateComplianceOk(currentWeekStart, currentWeekEnd, plantIds);
      const previousComplianceOk = await calculateComplianceOk(previousWeekStart, previousWeekEnd, plantIds);
      
      // Calculate missing compliance
      const currentMissingCompliance = await calculateMissingCompliance(currentWeekStart, currentWeekEnd, plantIds);
      const previousMissingCompliance = await calculateMissingCompliance(previousWeekStart, previousWeekEnd, plantIds);

      setCurrentWeekKPIs({
        fillRate: currentFillRate,
        ...currentBookingsKPIs,
        ...currentOtherKPIs,
        complianceRate: currentCompliance,
        complianceOk: currentComplianceOk,
        missingCompliance: currentMissingCompliance,
      });

      setPreviousWeekKPIs({
        fillRate: previousFillRate,
        ...previousBookingsKPIs,
        ...previousOtherKPIs,
        complianceRate: previousCompliance,
        complianceOk: previousComplianceOk,
        missingCompliance: previousMissingCompliance,
      });

      // Calculate plant breakdown if "all" plants selected
      if (selectedPlant === 'all' && filteredPlants.length > 0) {
        const breakdown = await Promise.all(
          filteredPlants.map(async (plant) => {
            const fillRate = await calculateFillRate(currentWeekStart, currentWeekEnd, [plant.id]);
            const otherKPIs = await calculateKPIsFromRecords(currentWeekStart, currentWeekEnd, [plant.id]);
            
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
      
      // --- Daily chart: head count by day for current week ---
      const dailyStart = format(currentWeekStart, "yyyy-MM-dd");
      const dailyEnd = format(currentWeekEnd, "yyyy-MM-dd");
      const { data: dailyBookings } = await supabase
        .from("bookings")
        .select("requested_kill_date, head_count, species")
        .gte("requested_kill_date", dailyStart)
        .lte("requested_kill_date", dailyEnd);

      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dailyMap: Record<string, { Cattle: number; Sheep: number; Lamb: number; Other: number }> = {};
      dayLabels.forEach((d) => (dailyMap[d] = { Cattle: 0, Sheep: 0, Lamb: 0, Other: 0 }));

      (dailyBookings || []).forEach((b: any) => {
        if (!b.requested_kill_date) return;
        const dayIndex = new Date(b.requested_kill_date).getDay(); // 0=Sun
        const labelIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Mon=0
        const label = dayLabels[labelIndex];
        const head = b.head_count || 0;
        const sp = (b.species || "").toLowerCase();
        if (sp === "cattle" || sp === "beef") dailyMap[label].Cattle += head;
        else if (sp === "sheep") dailyMap[label].Sheep += head;
        else if (sp === "lamb") dailyMap[label].Lamb += head;
        else dailyMap[label].Other += head;
      });

      setDailyChartData(
        dayLabels.map((d) => ({ day: d, ...dailyMap[d] }))
      );

      // --- Weekly trend: total head booked per week for last 8 weeks ---
      const weeksData = await Promise.all(
        Array.from({ length: 8 }, (_, i) => {
          const wStart = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 });
          const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
          return supabase
            .from("bookings")
            .select("head_count, species")
            .gte("requested_kill_date", format(wStart, "yyyy-MM-dd"))
            .lte("requested_kill_date", format(wEnd, "yyyy-MM-dd"))
            .then(({ data }) => ({
              week: `${format(wStart, "d MMM")}`,
              Cattle: (data || []).filter((b: any) => ["cattle","beef"].includes((b.species||"").toLowerCase())).reduce((s: number, b: any) => s + (b.head_count || 0), 0),
              Sheep: (data || []).filter((b: any) => (b.species||"").toLowerCase() === "sheep").reduce((s: number, b: any) => s + (b.head_count || 0), 0),
              Lamb: (data || []).filter((b: any) => (b.species||"").toLowerCase() === "lamb").reduce((s: number, b: any) => s + (b.head_count || 0), 0),
            }));
        })
      );
      setWeeklyTrendData(weeksData);

      setLoading(false);
    };

    if (plantsLoaded) {
      fetchKPIData();
    }
  }, [selectedPlant, selectedProcessor, plantsLoaded, currentWeekStart, previousWeekStart]);

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
  
  // Determine changeType based on variance_hours value
  const getVarianceChangeType = (variance: number): "positive" | "negative" | "neutral" => {
    if (variance <= 0.5) return "positive";
    if (variance > 1.5) return "negative";
    return "neutral";
  };
  
  const leadTimeChange = currentWeekKPIs && previousWeekKPIs ? 
    {
      ...calculateChange(previousWeekKPIs.varianceHours, currentWeekKPIs.varianceHours),
      type: getVarianceChangeType(currentWeekKPIs.varianceHours)
    } : 
    { value: "0", type: "neutral" as const, symbol: "" };
  
  const slotAdherenceChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.slotAdherence, previousWeekKPIs.slotAdherence) : 
    { value: "0", type: "neutral" as const, symbol: "" };
  
  const onSpecChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.onSpec, previousWeekKPIs.onSpec) : 
    { value: "0", type: "neutral" as const, symbol: "" };

  const gridFitChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.gridFitScore, previousWeekKPIs.gridFitScore) : 
    { value: "0", type: "neutral" as const, symbol: "" };

  const varianceHoursChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(previousWeekKPIs.varianceHours, currentWeekKPIs.varianceHours) : // Reversed for better is lower
    { value: "0", type: "neutral" as const, symbol: "" };

  const transportChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.transportConfirmed, previousWeekKPIs.transportConfirmed) : 
    { value: "0", type: "neutral" as const, symbol: "" };

  const loadsPendingChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(previousWeekKPIs.loadsPending, currentWeekKPIs.loadsPending) : // Reversed: fewer pending is better
    { value: "0", type: "neutral" as const, symbol: "" };

  const complianceChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.complianceRate, previousWeekKPIs.complianceRate) : 
    { value: "0", type: "neutral" as const, symbol: "" };

  const complianceOkChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(currentWeekKPIs.complianceOk, previousWeekKPIs.complianceOk) : 
    { value: "0", type: "neutral" as const, symbol: "" };

  const missingComplianceChange = currentWeekKPIs && previousWeekKPIs ? 
    calculateChange(previousWeekKPIs.missingCompliance, currentWeekKPIs.missingCompliance) : // Reversed: fewer missing is better
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
            <h1 className="text-3xl font-bold text-foreground">Operational KPIs</h1>
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
              <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select processor" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Processors</SelectItem>
                  {processors.map((processor) => (
                    <SelectItem key={processor} value={processor}>
                      {processor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Plants</SelectItem>
                  {filteredPlants.map((plant) => (
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
                <SelectContent className="bg-popover z-50">
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
            value={`${currentWeekKPIs.varianceHours.toFixed(1)}hr`}
            change={`${leadTimeChange.symbol}${leadTimeChange.value}hr vs last week`}
            changeType={leadTimeChange.type}
            icon={Calendar}
            description="Booking variance from requested time"
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
          <MetricCard
            title="Grid Fit Score"
            value={currentWeekKPIs.hasGridScoreData ? currentWeekKPIs.gridFitScore.toFixed(1) : "No grid scores yet"}
            change={currentWeekKPIs.hasGridScoreData ? `${gridFitChange.symbol}${gridFitChange.value} vs last week` : undefined}
            changeType={gridFitChange.type}
            icon={Target}
            description="Average booking grid alignment"
          />
          <MetricCard
            title="Variance Hours"
            value={`${currentWeekKPIs.varianceHours.toFixed(1)}hr`}
            change={`${varianceHoursChange.symbol}${varianceHoursChange.value}hr vs last week`}
            changeType={varianceHoursChange.type}
            icon={Clock}
            description="Average scheduling variance"
          />
          <MetricCard
            title="Transport Confirmed"
            value={`${currentWeekKPIs.transportConfirmed.toFixed(1)}%`}
            change={`${transportChange.symbol}${transportChange.value}pp vs last week`}
            changeType={transportChange.type}
            icon={Truck}
            description="Confirmed transport bookings"
          />
          <MetricCard
            title="Loads Pending"
            value={currentWeekKPIs.loadsPending}
            change={`${loadsPendingChange.symbol}${loadsPendingChange.value} vs last week`}
            changeType={loadsPendingChange.type}
            icon={Truck}
            description="Bookings awaiting transport confirmation"
          />
          <MetricCard
            title="Compliance Rate"
            value={`${currentWeekKPIs.complianceRate.toFixed(1)}%`}
            change={`${complianceChange.symbol}${complianceChange.value}pp vs last week`}
            changeType={complianceChange.type}
            icon={Target}
            description="Bookings with all compliance checks complete"
          />
          <MetricCard
            title="Compliance OK"
            value={`${currentWeekKPIs.complianceOk.toFixed(1)}%`}
            change={`${complianceOkChange.symbol}${complianceOkChange.value}pp vs last week`}
            changeType={complianceOkChange.type}
            icon={Target}
            description="Checks where all statuses are OK"
            thresholds={{
              value: currentWeekKPIs.complianceOk,
              greenAbove: 95,
              amberAbove: 80
            }}
          />
          <MetricCard
            title="Missing Compliance Records"
            value={currentWeekKPIs.missingCompliance}
            change={`${missingComplianceChange.symbol}${missingComplianceChange.value} vs last week`}
            changeType={missingComplianceChange.type}
            icon={Target}
            description="Checks with any status marked as missing"
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

        {/* Daily head count chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Head Count by Day — This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value.toLocaleString()} head`, name]}
                />
                <Legend />
                <Bar dataKey="Cattle" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Sheep" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Lamb" stackId="a" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly trend chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Booking Volume — Last 8 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value.toLocaleString()} head`, name]}
                />
                <Legend />
                <Bar dataKey="Cattle" stackId="a" fill="#2563eb" />
                <Bar dataKey="Sheep" stackId="a" fill="#16a34a" />
                <Bar dataKey="Lamb" stackId="a" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}