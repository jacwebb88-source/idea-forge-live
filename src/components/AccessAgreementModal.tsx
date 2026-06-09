import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";

const STORAGE_KEY = "muster_access_agreed";

export function AccessAgreementModal() {
  const [visible, setVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const hasAgreed = localStorage.getItem(STORAGE_KEY);
    if (!hasAgreed) setVisible(true);
  }, []);

  const handleAgree = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">

        {/* Logo + heading */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img
            src="/muster-logo.png"
            alt="Muster"
            className="h-16 w-16 rounded-xl object-cover shadow-md"
          />
          <h1 className="text-xl font-semibold text-slate-900">Confidential System Access</h1>
          <p className="text-sm text-slate-500">Webb Muster Pty Ltd</p>
        </div>

        {/* Terms */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 space-y-3 leading-relaxed">
          <p>
            This platform is a <strong>confidential system</strong> owned by Webb Muster Pty Ltd.
            Access is granted for authorised purposes only.
          </p>
          <p>By accessing this platform you agree that you will:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Not copy, reproduce, or replicate any part of its content, design, or functionality</li>
            <li>Not share access credentials or this link with any third party</li>
            <li>Not use any information contained herein for commercial purposes without written consent</li>
            <li>Keep all information viewed strictly confidential</li>
          </ul>
          <p className="text-slate-500 text-xs pt-1">
            Unauthorised use or distribution may result in legal action. All access is logged.
          </p>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={(val) => setAgreed(val === true)}
            className="mt-0.5"
          />
          <label htmlFor="agree" className="text-sm text-slate-700 cursor-pointer leading-snug">
            I understand this is a confidential system and I agree to the terms above
          </label>
        </div>

        {/* Button */}
        <Button
          className="w-full"
          disabled={!agreed}
          onClick={handleAgree}
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          I Agree — Enter Muster
        </Button>

      </div>
    </div>
  );
}
