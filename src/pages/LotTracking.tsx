import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ProvenanceQR } from "@/components/ProvenanceQR";
import { QrCode, Eye, Plus, Package, Globe, Award, CheckCircle } from "lucide-react";

interface ProvenanceLot {
  lot_code: string;
  kill_date: string;
  plant_name: string;
  species: string;
  breed: string;
  head_count: number;
  origin_property_name: string;
  vendor_name: string;
  program_name: string;
  hgp_free: boolean;
  eu_eligible: boolean;
  msa_graded: boolean;
  avg_msa_grade: number | null;
  avg_msa_index: number | null;
  avg_hscw_kg: number | null;
  destination_market: string;
  destination_country: string;
  health_cert_number: string | null;
  public_story: string | null;
}

const DEMO_LOTS: ProvenanceLot[] = [
  {
    lot_code: "MST-2025-0641",
    kill_date: "2025-05-12",
    plant_name: "Muster Plant",
    species: "Cattle",
    breed: "Angus",
    head_count: 180,
    origin_property_name: "Killarook Station",
    vendor_name: "Killarook Station",
    program_name: "GFF 100 Day",
    hgp_free: true,
    eu_eligible: true,
    msa_graded: true,
    avg_msa_grade: 4,
    avg_msa_index: 62.4,
    avg_hscw_kg: 318,
    destination_market: "Japan",
    destination_country: "JP",
    health_cert_number: "AUS-JP-2025-0641",
    public_story: null,
  },
  {
    lot_code: "MST-2025-0642",
    kill_date: "2025-05-13",
    plant_name: "Muster Plant",
    species: "Cattle",
    breed: "Angus Cross",
    head_count: 220,
    origin_property_name: "Merriwa Pastoral Co",
    vendor_name: "Merriwa Pastoral Co",
    program_name: "MSA Grassfed",
    hgp_free: true,
    eu_eligible: true,
    msa_graded: true,
    avg_msa_grade: 4,
    avg_msa_index: 60.1,
    avg_hscw_kg: 302,
    destination_market: "EU/Germany",
    destination_country: "DE",
    health_cert_number: "AUS-EU-2025-0642",
    public_story: null,
  },
  {
    lot_code: "MST-2025-0643",
    kill_date: "2025-05-14",
    plant_name: "Muster Plant",
    species: "Cattle",
    breed: "Wagyu Cross",
    head_count: 95,
    origin_property_name: "Chinchilla Plains Pastoral",
    vendor_name: "Chinchilla Plains Pastoral",
    program_name: "GFF 150 Day Japan Spec",
    hgp_free: true,
    eu_eligible: true,
    msa_graded: true,
    avg_msa_grade: 6,
    avg_msa_index: 74.8,
    avg_hscw_kg: 345,
    destination_market: "Japan",
    destination_country: "JP",
    health_cert_number: "AUS-JP-2025-0643",
    public_story: null,
  },
  {
    lot_code: "MST-2025-0644",
    kill_date: "2025-05-15",
    plant_name: "Muster Plant",
    species: "Cattle",
    breed: "Brahman Cross",
    head_count: 310,
    origin_property_name: "Darling Downs Feedlot",
    vendor_name: "Darling Downs Feedlot",
    program_name: "Halal Certified",
    hgp_free: false,
    eu_eligible: false,
    msa_graded: true,
    avg_msa_grade: 3,
    avg_msa_index: 55.2,
    avg_hscw_kg: 276,
    destination_market: "Halal/Malaysia",
    destination_country: "MY",
    health_cert_number: "AUS-MY-2025-0644",
    public_story: null,
  },
  {
    lot_code: "MST-2025-0645",
    kill_date: "2025-05-16",
    plant_name: "Muster Plant",
    species: "Cattle",
    breed: "Hereford",
    head_count: 140,
    origin_property_name: "Riverstone Station",
    vendor_name: "Riverstone Pastoral Co",
    program_name: "PCAS Grassfed",
    hgp_free: true,
    eu_eligible: true,
    msa_graded: true,
    avg_msa_grade: 5,
    avg_msa_index: 67.3,
    avg_hscw_kg: 290,
    destination_market: "Korea",
    destination_country: "KR",
    health_cert_number: "AUS-KR-2025-0645",
    public_story: null,
  },
];

const DESTINATION_FLAGS: Record<string, string> = {
  JP: "🇯🇵",
  DE: "🇩🇪",
  MY: "🇲🇾",
  KR: "🇰🇷",
  US: "🇺🇸",
};

function getMsaBadge(grade: number | null) {
  if (grade === null) return <Badge variant="outline">—</Badge>;
  if (grade >= 6)
    return (
      <Badge className="bg-amber-500 text-white border-0">MSA {grade}</Badge>
    );
  if (grade === 5)
    return (
      <Badge className="bg-green-600 text-white border-0">MSA {grade}</Badge>
    );
  if (grade === 4)
    return (
      <Badge className="bg-blue-600 text-white border-0">MSA {grade}</Badge>
    );
  return <Badge variant="secondary">MSA {grade}</Badge>;
}

function getDestinationLabel(lot: ProvenanceLot) {
  const flag = DESTINATION_FLAGS[lot.destination_country] ?? "🌐";
  return `${flag} ${lot.destination_market}`;
}

function formatKillDate(dateStr: string) {
  try {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export default function LotTracking() {
  const [lots, setLots] = useState<ProvenanceLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDialogLot, setQrDialogLot] = useState<ProvenanceLot | null>(null);

  useEffect(() => {
    async function fetchLots() {
      try {
        const { data, error } = await supabase
          .from("provenance_lots")
          .select("*")
          .order("kill_date", { ascending: false });

        if (error || !data || data.length === 0) {
          setLots(DEMO_LOTS);
        } else {
          setLots(data as ProvenanceLot[]);
        }
      } catch {
        setLots(DEMO_LOTS);
      } finally {
        setLoading(false);
      }
    }
    fetchLots();
  }, []);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const totalThisMonth = lots.filter((l) => {
    const d = new Date(l.kill_date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const euEligible = lots.filter((l) => l.eu_eligible).length;
  const msaGraded = lots.filter((l) => l.msa_graded).length;
  const qrGenerated = lots.filter((l) => !!l.health_cert_number).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Lot Tracking &amp; Provenance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate QR codes and manage provenance records for all kill lots
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Lot Record
          </Button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Lots This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "—" : totalThisMonth}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">EU Eligible Lots</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "—" : euEligible}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Award className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">MSA Graded Lots</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "—" : msaGraded}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <QrCode className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">QR Codes Generated</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "—" : qrGenerated}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lots table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Kill Lots</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Lot Code</TableHead>
                  <TableHead>Kill Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead className="text-right">Head</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>MSA Grade</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>EU Eligible</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-gray-400">
                      Loading lots…
                    </TableCell>
                  </TableRow>
                ) : (
                  lots.map((lot) => (
                    <TableRow key={lot.lot_code}>
                      <TableCell className="pl-6 font-mono text-sm font-medium text-gray-900">
                        {lot.lot_code}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatKillDate(lot.kill_date)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {lot.origin_property_name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {lot.breed}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-700">
                        {lot.head_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {lot.program_name}
                      </TableCell>
                      <TableCell>{getMsaBadge(lot.avg_msa_grade)}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {getDestinationLabel(lot)}
                      </TableCell>
                      <TableCell>
                        {lot.eu_eligible ? (
                          <Badge className="bg-green-100 text-green-800 border-0">
                            EU ✓
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Non-EU</Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View QR"
                            onClick={() => setQrDialogLot(lot)}
                          >
                            <QrCode className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Preview provenance page"
                            onClick={() =>
                              window.open(
                                `/provenance/${lot.lot_code}`,
                                "_blank"
                              )
                            }
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* QR Dialog */}
      <Dialog open={!!qrDialogLot} onOpenChange={(open) => !open && setQrDialogLot(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              {qrDialogLot?.lot_code}
            </DialogTitle>
          </DialogHeader>
          {qrDialogLot && (
            <div className="flex justify-center py-2">
              <ProvenanceQR
                lotCode={qrDialogLot.lot_code}
                lotDetails={{
                  breed: qrDialogLot.breed,
                  killDate: qrDialogLot.kill_date,
                  headCount: qrDialogLot.head_count,
                  msa_grade: qrDialogLot.avg_msa_grade,
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
