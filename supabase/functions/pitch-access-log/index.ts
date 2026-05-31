import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { viewer, accessed_at } = await req.json();

    const accessedDate = new Date(accessed_at).toLocaleString("en-AU", {
      timeZone: "Australia/Melbourne",
      dateStyle: "full",
      timeStyle: "short",
    });

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "Muster Access Log <noreply@muster.app>",
        to: ["jacwebb88@gmail.com"],
        subject: `👁 Pitch viewed by ${viewer}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <div style="background: #166534; padding: 20px 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">Muster Pitch Viewed</h2>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 16px; color: #374151;">Someone just viewed your investor pitch:</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Viewer</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${viewer}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time (AEST)</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px;">${accessedDate}</td>
                </tr>
              </table>
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      console.error("Resend error:", await res.text());
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
