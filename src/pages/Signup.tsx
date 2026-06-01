import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { HintTooltip, HINTS } from "@/components/HintTooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessType = "farm" | "feedlot" | "boning_room" | "processor" | "enterprise";
type AustralianState = "QLD" | "NSW" | "VIC" | "SA" | "WA" | "NT" | "TAS";
type HearAboutUs =
  | "industry_event"
  | "word_of_mouth"
  | "social_media"
  | "google"
  | "mla"
  | "other";

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessType: BusinessType | "";
  state: AustralianState | "";
  picNumber: string;
  hearAboutUs: HearAboutUs | "";
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  businessName?: string;
  businessType?: string;
  state?: string;
}

// ─── Demo login helper ─────────────────────────────────────────────────────────

const DEMO_EMAIL = "demo@muster.com.au";
const DEMO_PASSWORD = "MusterDemo2025!";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    businessType: "",
    state: "",
    picNumber: "",
    hearAboutUs: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── Field update ──────────────────────────────────────────────────────────

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!form.fullName.trim()) next.fullName = "Full name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address";
    }
    if (!form.password) {
      next.password = "Password is required";
    } else if (form.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (!form.confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    if (!form.businessName.trim()) next.businessName = "Business name is required";
    if (!form.businessType) next.businessType = "Please select a business type";
    if (!form.state) next.state = "Please select a state";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError("");

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { display_name: form.fullName },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Signup failed — please try again");

      const userId = authData.user.id;

      // 2. Insert organisation (table may not be in generated types — use any cast)
      const { data: orgData, error: orgError } = await (supabase as any)
        .from("organisations")
        .insert({
          name: form.businessName,
          org_type: form.businessType,
          state: form.state,
          pic_number: form.picNumber || null,
          plan: "trial",
        })
        .select("id")
        .single();

      const orgId: string | null = orgError ? null : orgData?.id ?? null;

      // 3. Insert profile (use available columns; org_id and display_name are bonus if present)
      await (supabase as any)
        .from("profiles")
        .upsert({
          id: userId,
          role: "supplier",
          ...(orgId ? { org_id: orgId } : {}),
          display_name: form.fullName,
          email: form.email,
        });

      // 4. Done — if session exists navigate, otherwise show confirmation
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        navigate("/home");
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Demo login ────────────────────────────────────────────────────────────

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (error) {
      setSubmitError("Demo unavailable — please try again");
      setDemoLoading(false);
    } else {
      navigate("/home");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative column ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")",
          }}
        />

        <div className="relative z-10 space-y-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/muster-logo.png"
              alt="Muster"
              className="h-12 w-12 rounded-xl object-cover shadow-lg"
            />
            <span className="text-white text-xl font-bold tracking-tight">Muster</span>
          </div>

          {/* Feature highlights */}
          <div className="space-y-6">
            {[
              {
                icon: "🐄",
                text: "Track every animal from farm to fork",
              },
              {
                icon: "📊",
                text: "See your kill results without calling anyone",
              },
              {
                icon: "🌍",
                text: "Know which markets your cattle qualify for",
              },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-4">
                <span className="text-2xl shrink-0">{icon}</span>
                <p className="text-white/85 text-base leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/50 text-sm">Trusted by Australian livestock operators</p>
        </div>
      </div>

      {/* ── Right form column ──────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-lg space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 text-sm">
              Start your free 30-day trial. No credit card required.
            </p>
          </div>

          {/* Success state */}
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
              <p className="text-green-800 font-semibold text-lg">Account created!</p>
              <p className="text-green-700 text-sm">
                Check your email to confirm your account, then log in to get started.
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 text-green-700 hover:text-green-900 font-medium text-sm underline"
              >
                Go to login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* ── Personal details ──────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Full name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                      Full name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Smith"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      className={errors.fullName ? "border-red-400 focus-visible:ring-red-400" : ""}
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-xs">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="jane@example.com.au"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs">{errors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
                        className={
                          errors.password
                            ? "border-red-400 focus-visible:ring-red-400 pr-10"
                            : "pr-10"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-xs">{errors.password}</p>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Repeat your password"
                        value={form.confirmPassword}
                        onChange={(e) => update("confirmPassword", e.target.value)}
                        className={
                          errors.confirmPassword
                            ? "border-red-400 focus-visible:ring-red-400 pr-10"
                            : "pr-10"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Business details ──────────────────────────────────────── */}
              <div className="border-t border-gray-200 pt-5 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Business details</p>

                {/* Business / property name */}
                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                    Business / property name
                  </Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Smith Pastoral Co."
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                    className={errors.businessName ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {errors.businessName && (
                    <p className="text-red-500 text-xs">{errors.businessName}</p>
                  )}
                </div>

                {/* Business type + State — side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Business type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="businessType" className="text-sm font-medium text-gray-700">
                      Business type
                    </Label>
                    <select
                      id="businessType"
                      value={form.businessType}
                      onChange={(e) => update("businessType", e.target.value as BusinessType)}
                      className={`w-full h-10 rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 ${
                        errors.businessType ? "border-red-400" : "border-input"
                      }`}
                    >
                      <option value="">Select...</option>
                      <option value="farm">Farm</option>
                      <option value="feedlot">Feedlot</option>
                      <option value="boning_room">Boning Room</option>
                      <option value="processor">Processor</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                    {errors.businessType && (
                      <p className="text-red-500 text-xs">{errors.businessType}</p>
                    )}
                  </div>

                  {/* State */}
                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                      State
                    </Label>
                    <select
                      id="state"
                      value={form.state}
                      onChange={(e) => update("state", e.target.value as AustralianState)}
                      className={`w-full h-10 rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 ${
                        errors.state ? "border-red-400" : "border-input"
                      }`}
                    >
                      <option value="">Select...</option>
                      {(["QLD", "NSW", "VIC", "SA", "WA", "NT", "TAS"] as AustralianState[]).map(
                        (s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        )
                      )}
                    </select>
                    {errors.state && (
                      <p className="text-red-500 text-xs">{errors.state}</p>
                    )}
                  </div>
                </div>

                {/* PIC number */}
                <div className="space-y-1.5">
                  <Label htmlFor="picNumber" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    PIC number
                    <HintTooltip
                      term={HINTS.pic.explanation ? "PIC" : "PIC number"}
                      explanation="Property Identification Code — your farm's unique ID. Optional but recommended."
                    />
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="picNumber"
                    type="text"
                    placeholder="e.g. QA123456"
                    value={form.picNumber}
                    onChange={(e) => update("picNumber", e.target.value)}
                  />
                </div>

                {/* How did you hear about us */}
                <div className="space-y-1.5">
                  <Label htmlFor="hearAboutUs" className="text-sm font-medium text-gray-700">
                    How did you hear about us?
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </Label>
                  <select
                    id="hearAboutUs"
                    value={form.hearAboutUs}
                    onChange={(e) => update("hearAboutUs", e.target.value as HearAboutUs)}
                    className="w-full h-10 rounded-md border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                  >
                    <option value="">Select...</option>
                    <option value="industry_event">Industry event</option>
                    <option value="word_of_mouth">Word of mouth</option>
                    <option value="social_media">Social media</option>
                    <option value="google">Google</option>
                    <option value="mla">MLA</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* ── Submit error ──────────────────────────────────────────── */}
              {submitError && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {submitError}
                </p>
              )}

              {/* ── Submit button ─────────────────────────────────────────── */}
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-xl gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* ── Footer links ──────────────────────────────────────────── */}
              <div className="space-y-3 pt-2 text-center">
                <p className="text-gray-500 text-sm">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-emerald-700 hover:text-emerald-900 font-medium"
                  >
                    Log in →
                  </Link>
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-gray-400 text-xs">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDemoLogin}
                  disabled={demoLoading}
                  className="w-full gap-2 text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  {demoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "🔍"
                  )}
                  Want to see it first? Explore the demo →
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
