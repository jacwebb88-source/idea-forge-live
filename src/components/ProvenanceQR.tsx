import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';

interface ProvenanceQRProps {
  lotCode: string;
  lotDetails?: {
    breed?: string;
    killDate?: string;
    headCount?: number;
    msa_grade?: string;
  };
}

export default function ProvenanceQR({ lotCode, lotDetails }: ProvenanceQRProps) {
  const [copied, setCopied] = useState(false);

  const provenanceUrl = `https://app.muster.com.au/provenance/${lotCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(provenanceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = provenanceUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById(`qr-${lotCode}`);
    if (!svg) return;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const link = document.createElement('a');
      link.download = `muster-provenance-${lotCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const summaryParts: string[] = [];
  if (lotDetails?.breed) summaryParts.push(lotDetails.breed);
  if (lotDetails?.killDate) {
    const d = new Date(lotDetails.killDate + 'T00:00:00');
    summaryParts.push(
      d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    );
  }
  if (lotDetails?.headCount) summaryParts.push(`${lotDetails.headCount} head`);
  if (lotDetails?.msa_grade) summaryParts.push(`MSA ${lotDetails.msa_grade}`);

  return (
    <Card className="bg-white shadow-sm border border-gray-100">
      <CardContent className="p-5 flex flex-col items-center gap-4">
        {/* QR Code */}
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-inner">
          <QRCodeSVG
            id={`qr-${lotCode}`}
            value={provenanceUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#1a1a1a"
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Lot code */}
        <div className="text-center">
          <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">{lotCode}</p>
          {summaryParts.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{summaryParts.join(' · ')}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={copyLink}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={downloadQR}
          >
            <Download className="w-3.5 h-3.5" />
            Download QR
          </Button>
        </div>

        {/* Helper note */}
        <p className="text-xs text-gray-400 text-center">
          Place this QR code on carton labels and retail packaging
        </p>
      </CardContent>
    </Card>
  );
}
