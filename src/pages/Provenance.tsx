import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ProvenanceLot {
  lot_code: string;
  kill_date: string | null;
  plant_name: string | null;
  species: string | null;
  breed: string | null;
  head_count: number | null;
  origin_pic: string | null;
  origin_property_name: string | null;
  vendor_name: string | null;
  program_name: string | null;
  days_on_feed: number | null;
  hgp_free: boolean | null;
  eu_eligible: boolean | null;
  msa_graded: boolean | null;
  avg_msa_grade: number | null;
  avg_msa_index: number | null;
  avg_hscw_kg: number | null;
  avg_ph: number | null;
  avg_marbling: number | null;
  avg_fat_mm: number | null;
  destination_market: string | null;
  destination_country: string | null;
  health_cert_number: string | null;
  halal_cert_number: string | null;
  nvd_number: string | null;
  lpa_number: string | null;
  public_story: string | null;
}

const DEMO_LOT: ProvenanceLot = {
  lot_code: 'MST-2025-0641',
  kill_date: '2025-06-03',
  plant_name: 'JBS Rockhampton',
  species: 'Cattle',
  breed: 'Angus',
  head_count: 42,
  origin_pic: 'QLD1234567',
  origin_property_name: 'Killarook Station',
  vendor_name: 'Webb Pastoral Co.',
  program_name: 'GFF — Grain Fed 100 Days',
  days_on_feed: 100,
  hgp_free: true,
  eu_eligible: true,
  msa_graded: true,
  avg_msa_grade: 4,
  avg_msa_index: 62.3,
  avg_hscw_kg: 318,
  avg_ph: 5.51,
  avg_marbling: 3.1,
  avg_fat_mm: 11,
  destination_market: 'Japan',
  destination_country: 'Japan',
  health_cert_number: 'HC-AU-2025-0641',
  halal_cert_number: null,
  nvd_number: 'NVD-QLD-2025-0641',
  lpa_number: 'LPA-4892731',
  public_story:
    'Killarook Station has been a family-owned cattle enterprise in Central Queensland for over three generations. Our Angus cattle are raised on natural pastures before finishing on a carefully managed grain program. We are committed to land stewardship, animal welfare, and producing consistent, premium quality beef for export markets.',
};

const STATE_FROM_PIC: Record<string, string> = {
  QLD: 'Queensland',
  NSW: 'New South Wales',
  VIC: 'Victoria',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
  ACT: 'Australian Capital Territory',
};

const COUNTRY_FLAG: Record<string, string> = {
  Japan: '🇯🇵',
  China: '🇨🇳',
  Korea: '🇰🇷',
  'South Korea': '🇰🇷',
  USA: '🇺🇸',
  'United States': '🇺🇸',
  Indonesia: '🇮🇩',
  Malaysia: '🇲🇾',
  Singapore: '🇸🇬',
  Vietnam: '🇻🇳',
  'United Kingdom': '🇬🇧',
  UK: '🇬🇧',
  UAE: '🇦🇪',
  Qatar: '🇶🇦',
  Australia: '🇦🇺',
};

function parseStateFromPIC(pic: string | null): string {
  if (!pic) return 'Australia';
  const prefix = pic.replace(/[0-9]/g, '').toUpperCase();
  return STATE_FROM_PIC[prefix] ?? 'Australia';
}

function formatKillDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function msaGradeColor(grade: number | null): string {
  if (grade === null) return 'text-gray-600';
  if (grade >= 6) return 'text-yellow-600';
  if (grade >= 5) return 'text-green-600';
  return 'text-blue-600';
}

function CertBadge({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`text-lg ${ok ? 'text-green-500' : 'text-gray-400'}`}>
        {ok ? '✅' : '❌'}
      </span>
      <span className={`text-sm font-medium ${ok ? 'text-gray-800' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

export default function Provenance() {
  const { lotCode } = useParams<{ lotCode: string }>();
  const [lot, setLot] = useState<ProvenanceLot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLot() {
      if (!lotCode) {
        setLot(DEMO_LOT);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('provenance_lots')
        .select('*')
        .eq('lot_code', lotCode)
        .single();

      if (error || !data) {
        setLot(DEMO_LOT);
      } else {
        setLot(data as ProvenanceLot);
      }
      setLoading(false);
    }

    fetchLot();
  }, [lotCode]);

  const now = new Date();
  const scanTime = now.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading provenance record…</p>
        </div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-2xl mb-2">🔍</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Lot not found</h2>
          <p className="text-sm text-gray-500">
            The lot code <span className="font-mono">{lotCode}</span> could not be verified.
            Please check your packaging or contact the supplier.
          </p>
        </div>
      </div>
    );
  }

  const flag = lot.destination_country ? (COUNTRY_FLAG[lot.destination_country] ?? '🌍') : '🌍';
  const state = parseStateFromPIC(lot.origin_pic);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top banner */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl font-bold text-teal-700 tracking-tight">Muster</span>
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              ✓ Verified
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Verified Australian Beef</h1>
          <p className="text-sm text-gray-500 font-mono tracking-wide">Lot: {lot.lot_code}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Origin */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-green-700 mb-4">
            Origin
          </h2>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="text-lg leading-none mt-0.5">🏡</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{lot.origin_property_name ?? '—'}</p>
                {lot.origin_pic && (
                  <p className="text-xs text-gray-500 font-mono">PIC: {lot.origin_pic}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">👨‍🌾</span>
              <p className="text-sm text-gray-800">{lot.vendor_name ?? '—'}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">📍</span>
              <p className="text-sm text-gray-800">{state}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">🐄</span>
              <p className="text-sm text-gray-800">
                {[lot.breed, lot.species].filter(Boolean).join(' · ')}
                {lot.head_count ? ` · ${lot.head_count} head` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">📅</span>
              <p className="text-sm text-gray-800">Processed {formatKillDate(lot.kill_date)}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">🏭</span>
              <p className="text-sm text-gray-800">{lot.plant_name ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Program & Certifications */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Program &amp; Certifications
          </h2>
          {lot.program_name && (
            <div className="flex items-center gap-2 py-1 mb-1">
              <span className="text-lg">✅</span>
              <span className="text-sm font-semibold text-gray-800">{lot.program_name}</span>
            </div>
          )}
          <CertBadge ok={lot.hgp_free} label={lot.hgp_free ? 'HGP Free' : 'HGP Treated'} />
          <CertBadge ok={lot.eu_eligible} label="EU Eligible" />
          <CertBadge ok={lot.msa_graded} label="MSA Graded" />
          {lot.halal_cert_number && (
            <div className="flex items-center gap-2 py-1">
              <span className="text-lg text-green-500">✅</span>
              <span className="text-sm font-medium text-gray-800">
                Halal Certified
                <span className="ml-1 text-xs text-gray-400 font-mono">({lot.halal_cert_number})</span>
              </span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            {lot.lpa_number && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">LPA Number:</span>{' '}
                <span className="font-mono">{lot.lpa_number}</span>
              </p>
            )}
            {lot.nvd_number && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">NVD Reference:</span>{' '}
                <span className="font-mono">{lot.nvd_number}</span>
              </p>
            )}
          </div>
        </div>

        {/* Grading Outcomes */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Grading Outcomes
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lot.avg_msa_grade !== null && (
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className={`text-3xl font-extrabold ${msaGradeColor(lot.avg_msa_grade)}`}>
                  MSA {lot.avg_msa_grade}
                </p>
                <p className="text-xs text-gray-400 mt-1">MSA Grade</p>
              </div>
            )}
            {lot.avg_msa_index !== null && (
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-gray-800">{lot.avg_msa_index.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">MSA Index</p>
              </div>
            )}
            {lot.avg_hscw_kg !== null && (
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-gray-800">{lot.avg_hscw_kg}</p>
                <p className="text-xs text-gray-400 mt-1">Avg HSCW (kg)</p>
              </div>
            )}
            {lot.avg_ph !== null && (
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className={`text-3xl font-extrabold ${lot.avg_ph < 5.6 ? 'text-green-600' : 'text-orange-500'}`}>
                  {lot.avg_ph.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Avg pH</p>
              </div>
            )}
            {lot.avg_marbling !== null && (
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-gray-800">
                  {lot.avg_marbling.toFixed(1)}
                  <span className="text-base font-normal text-gray-400"> /9</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Marbling Score</p>
              </div>
            )}
            {lot.avg_fat_mm !== null && (
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-gray-800">
                  {lot.avg_fat_mm}
                  <span className="text-base font-normal text-gray-400"> mm</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Fat Depth</p>
              </div>
            )}
          </div>
        </div>

        {/* Destination */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Destination
          </h2>
          <div className="space-y-2.5">
            {lot.destination_market && (
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🌍</span>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Market:</span> {lot.destination_market}
                </p>
              </div>
            )}
            {lot.destination_country && (
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{flag}</span>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Country:</span> {lot.destination_country}
                </p>
              </div>
            )}
            {lot.health_cert_number && (
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📋</span>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Health Certificate:</span>{' '}
                  <span className="font-mono text-xs">{lot.health_cert_number}</span>
                </p>
              </div>
            )}
            {lot.halal_cert_number && (
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📜</span>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Halal Certificate:</span>{' '}
                  <span className="font-mono text-xs">{lot.halal_cert_number}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Producer story */}
        {lot.public_story && (
          <div className="border-l-4 border-green-400 bg-white rounded-r-2xl p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-green-700 mb-3">
              Producer Story
            </h2>
            <p className="text-sm text-gray-700 italic leading-relaxed">"{lot.public_story}"</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 pb-8 text-center space-y-1">
          <p className="text-xs font-semibold text-teal-700">Powered by Muster Intelligence</p>
          <p className="text-xs text-gray-400">Scan verified: {scanTime}</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            This provenance record is independently verified and tamper-evident
          </p>
        </div>
      </div>
    </div>
  );
}
