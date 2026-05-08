import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Building2, Bell, Shield, Database, ChevronRight } from "lucide-react";
import { useState } from "react";

type SettingsSection = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
};

const sections: SettingsSection[] = [
  { id: "plant",        label: "Plant / Processor",   icon: Building2, description: "Default plant, chain capacity, species configuration" },
  { id: "notifications", label: "Notifications",       icon: Bell,      description: "Email alerts, urgency thresholds, reminder windows" },
  { id: "compliance",   label: "Compliance Rules",     icon: Shield,    description: "Required fields, HGP sequencing, market access programs" },
  { id: "data",         label: "Data & Integrations",  icon: Database,  description: "Supabase connection, CSV import rules, API keys" },
];

export default function Settings() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("plant");

  // Plant settings state
  const [defaultSlotWindow, setDefaultSlotWindow] = useState("30");
  const [exitReminderDays, setExitReminderDays] = useState("14");
  const [hgpSequenceWarn, setHgpSequenceWarn] = useState(true);
  const [requireMulesing, setRequireMulesing] = useState(true);
  const [requirePIC, setRequirePIC] = useState(true);
  const [requireENVD, setRequireENVD] = useState(false);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your changes have been saved. They will apply to new bookings going forward.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure Muster for your plant, compliance requirements, and workflow
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar nav */}
          <Card className="lg:col-span-1 h-fit">
            <CardContent className="p-2">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                    activeSection === s.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{s.label}</span>
                  <ChevronRight className="h-3 w-3 ml-auto shrink-0 opacity-40" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Main settings panel */}
          <div className="lg:col-span-3 space-y-4">

            {activeSection === "plant" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Scheduling Defaults
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="slot-window">Arrival slot window (minutes)</Label>
                        <Select value={defaultSlotWindow} onValueChange={setDefaultSlotWindow}>
                          <SelectTrigger id="slot-window">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Size of each arrival slot window on the booking form</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exit-reminder">Exit date reminder window (days)</Label>
                        <Input
                          id="exit-reminder"
                          type="number"
                          min={1}
                          max={60}
                          value={exitReminderDays}
                          onChange={e => setExitReminderDays(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">How far ahead to show unconfirmed booking reminders on the dashboard</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      HGP & Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div>
                        <p className="text-sm font-medium">Warn on HGP sequencing errors</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Show a warning when HGP-treated animals appear before HGP-free in the kill order
                        </p>
                      </div>
                      <Switch checked={hgpSequenceWarn} onCheckedChange={setHgpSequenceWarn} />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div>
                        <p className="text-sm font-medium">Require mulesing status for lamb/sheep</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Block booking submission if mulesing status is not declared
                        </p>
                      </div>
                      <Switch checked={requireMulesing} onCheckedChange={setRequireMulesing} />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div>
                        <p className="text-sm font-medium">Require PIC number</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Property Identification Code mandatory on all bookings
                        </p>
                      </div>
                      <Switch checked={requirePIC} onCheckedChange={setRequirePIC} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">Require eNVD reference</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Electronic National Vendor Declaration required before confirmation
                        </p>
                      </div>
                      <Switch checked={requireENVD} onCheckedChange={setRequireENVD} />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md bg-muted/40 border border-border px-4 py-3">
                    <p className="text-sm font-medium">Email notifications</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Email alerts for unconfirmed bookings, compliance gaps, and HGP sequencing issues.
                      Requires an SMTP integration or Supabase Edge Function — coming soon.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Exit date reminder", sublabel: "Booking unconfirmed within reminder window", enabled: true },
                      { label: "HGP sequence warning", sublabel: "Kill order has sequencing issue", enabled: true },
                      { label: "Compliance gap alert", sublabel: "Missing NVD, NLIS or PIC records", enabled: true },
                      { label: "New intake form submission", sublabel: "Supplier submits a booking request", enabled: false },
                    ].map(n => (
                      <div key={n.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium">{n.label}</p>
                          <p className="text-xs text-muted-foreground">{n.sublabel}</p>
                        </div>
                        <Switch defaultChecked={n.enabled} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "compliance" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Compliance Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Compliance rule configuration — required fields per species, market access program enrolment
                    (MSA, EU/UK), and HGP treatment restrictions — will be configurable here in the next release.
                  </p>
                  <div className="mt-4 space-y-2 rounded-md bg-muted/40 border border-border p-4 text-sm">
                    <p className="font-medium">Currently enforced (hard-coded):</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                      <li>Mulesing status required for lamb/sheep bookings</li>
                      <li>HGP-free animals must appear before HGP-treated in kill order</li>
                      <li>Species must be declared on every booking</li>
                      <li>Head count must be &gt; 0</li>
                      <li>Kill date is required</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "data" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Data & Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-800">Supabase — Connected</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Live connection to your Supabase project. All booking, supplier, plant, and compliance
                      data is stored and queried in real time.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Planned integrations</p>
                    {[
                      { name: "NLIS (National Livestock Identification System)",  status: "Planned" },
                      { name: "eNVD (Electronic National Vendor Declaration)",    status: "Planned" },
                      { name: "MLA MSA Enrolment API",                            status: "Planned" },
                      { name: "Resend / SMTP (Kill Report email sending)",        status: "Planned" },
                    ].map(i => (
                      <div key={i.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <p className="text-sm text-muted-foreground">{i.name}</p>
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                          {i.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save button */}
            <div className="flex justify-end">
              <Button onClick={handleSave}>Save settings</Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
