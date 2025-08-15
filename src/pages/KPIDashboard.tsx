import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, FileText } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useState } from "react";

// Mock KPI data
const mockKPIData = {
  currentWeek: {
    fillRate: 87.5,
    leadTimeVariance: 4.2,
    changesCount: 12,
    reworkHours: 6.5,
    slotAdherence: 92.3,
    onSpec: 94.8,
  },
  previousWeek: {
    fillRate: 83.2,
    leadTimeVariance: 5.8,
    changesCount: 18,
    reworkHours: 9.2,
    slotAdherence: 88.7,
    onSpec: 91.2,
  },
  plantBreakdown: [
    {
      plant: "JBS - Dinmore (test)",
      fillRate: 92.1,
      leadTimeVariance: 3.2,
      slotAdherence: 95.5,
      onSpec: 96.2,
    },
    {
      plant: "Teys - Beenleigh (test)",
      fillRate: 89.3,
      leadTimeVariance: 4.1,
      slotAdherence: 91.8,
      onSpec: 94.7,
    },
    {
      plant: "NH Foods - Oakey (test)",
      fillRate: 81.7,
      leadTimeVariance: 5.9,
      slotAdherence: 87.1,
      onSpec: 92.1,
    },
  ],
};

export default function KPIDashboard() {
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [timeRange, setTimeRange] = useState("week");

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

  const fillRateChange = calculateChange(mockKPIData.currentWeek.fillRate, mockKPIData.previousWeek.fillRate);
  const leadTimeChange = calculateChange(mockKPIData.previousWeek.leadTimeVariance, mockKPIData.currentWeek.leadTimeVariance); // Reversed for better is lower
  const slotAdherenceChange = calculateChange(mockKPIData.currentWeek.slotAdherence, mockKPIData.previousWeek.slotAdherence);
  const onSpecChange = calculateChange(mockKPIData.currentWeek.onSpec, mockKPIData.previousWeek.onSpec);

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
                  <SelectItem value="JBS - Dinmore (test)">JBS - Dinmore</SelectItem>
                  <SelectItem value="Teys - Beenleigh (test)">Teys - Beenleigh</SelectItem>
                  <SelectItem value="NH Foods - Oakey (test)">NH Foods - Oakey</SelectItem>
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
            value={`${mockKPIData.currentWeek.fillRate}%`}
            change={`${fillRateChange.symbol}${fillRateChange.value}pp vs last week`}
            changeType={fillRateChange.type}
            icon={BarChart3}
            description="Booked head / planned head"
          />
          <MetricCard
            title="Lead Time Variance"
            value={`${mockKPIData.currentWeek.leadTimeVariance}hr`}
            change={`${leadTimeChange.symbol}${leadTimeChange.value}hr vs last week`}
            changeType={leadTimeChange.type}
            icon={Calendar}
            description="Confirmed vs requested timing"
          />
          <MetricCard
            title="Slot Adherence"
            value={`${mockKPIData.currentWeek.slotAdherence}%`}
            change={`${slotAdherenceChange.symbol}${slotAdherenceChange.value}pp vs last week`}
            changeType={slotAdherenceChange.type}
            icon={TrendingUp}
            description="Kept slots / assigned slots"
          />
          <MetricCard
            title="On-Spec Rate"
            value={`${mockKPIData.currentWeek.onSpec}%`}
            change={`${onSpecChange.symbol}${onSpecChange.value}pp vs last week`}
            changeType={onSpecChange.type}
            icon={TrendingUp}
            description="Correct grid / total head"
          />
          <MetricCard
            title="Changes Count"
            value={mockKPIData.currentWeek.changesCount}
            change={`${mockKPIData.currentWeek.changesCount - mockKPIData.previousWeek.changesCount} vs last week`}
            changeType={(mockKPIData.currentWeek.changesCount < mockKPIData.previousWeek.changesCount ? "positive" : "negative") as "positive" | "negative" | "neutral"}
            icon={Calendar}
            description="Weekly booking changes"
          />
          <MetricCard
            title="Rework Hours"
            value={`${mockKPIData.currentWeek.reworkHours}hr`}
            change={`${(mockKPIData.currentWeek.reworkHours - mockKPIData.previousWeek.reworkHours).toFixed(1)}hr vs last week`}
            changeType={(mockKPIData.currentWeek.reworkHours < mockKPIData.previousWeek.reworkHours ? "positive" : "negative") as "positive" | "negative" | "neutral"}
            icon={TrendingDown}
            description="Changes × avg time per change"
          />
        </div>

        {/* Plant Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Plant Performance Breakdown</CardTitle>
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
                  {mockKPIData.plantBreakdown.map((plant, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-medium">{plant.plant}</td>
                      <td className="py-3 px-2 text-right">{plant.fillRate}%</td>
                      <td className="py-3 px-2 text-right">{plant.leadTimeVariance}hr</td>
                      <td className="py-3 px-2 text-right">{plant.slotAdherence}%</td>
                      <td className="py-3 px-2 text-right">{plant.onSpec}%</td>
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

        {/* Pilot Results Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Pilot Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Key Improvements</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Fill rate improved by +4.3pp</li>
                    <li>• Lead-time variance reduced by 1.6 hours</li>
                    <li>• Changes down 33%</li>
                    <li>• Slot adherence up 3.6pp</li>
                    <li>• On-spec rate up 3.6pp</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Areas for Focus</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• NH Foods - Oakey performance below target</li>
                    <li>• Transport coordination improvements needed</li>
                    <li>• Grid spec adherence training required</li>
                    <li>• Booking change process optimization</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Overall Assessment:</strong> The Muster IT pilot shows significant improvements across key metrics. 
                  Fill rate and adherence gains demonstrate successful implementation. Focus areas identified for optimization 
                  in the next phase.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}