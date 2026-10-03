import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind =
  | "claim_submitted"
  | "claim_approved"
  | "claim_rejected"
  | "claim_withdrawn"
  | "claim_superseded"
  | "item_returned"
  | "item_deleted"
  | "possible_match"
  | "meetup_updated";

interface Payload {
  kind: Kind;
  claimId?: string;
  itemId?: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  related_item_id: string | null;
  kind: Kind;
}

// Emails mirror in-app alerts. Only alerts created in the last few minutes count,
// so an old claim can't be used to re-send mail later.
const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAILS_PER_CALL = 10;

const TEMPLATES: Record<Kind, { heading: string; hrefPath: (row: NotificationRow) => string }> = {
  claim_submitted: { heading: "Someone contacted you about a listing", hrefPath: () => "/dashboard?tab=incoming" },
  claim_approved: { heading: "Your claim was accepted", hrefPath: () => "/dashboard?tab=my-claims" },
  claim_rejected: { heading: "Your claim was declined", hrefPath: () => "/dashboard?tab=my-claims" },
  claim_withdrawn: { heading: "A claim was withdrawn", hrefPath: () => "/dashboard?tab=incoming" },
  claim_superseded: { heading: "Another claim was accepted", hrefPath: () => "/dashboard?tab=my-claims" },
  item_returned: { heading: "Item marked returned", hrefPath: () => "/dashboard?tab=my-claims" },
  item_deleted: { heading: "Listing removed", hrefPath: () => "/dashboard?tab=my-claims" },
  possible_match: {
    heading: "A listing may match yours",
    hrefPath: (row) => (row.related_item_id ? `/items/${row.related_item_id}` : "/dashboard?tab=notifications"),
  },
  meetup_updated: { heading: "Meetup details changed", hrefPath: () => "/dashboard?tab=notifications" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return json({ sent: 0, skipped: "email_not_configured" });
    }

    const from = Deno.env.get("RESEND_FROM_EMAIL");
    if (!from) {
      return json({ sent: 0, skipped: "missing_from_address" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ sent: 0, skipped: "missing_supabase_env" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.kind || !(payload.kind in TEMPLATES)) {
      return json({ error: "A valid kind is required" }, 400);
    }
    if (!payload.claimId && !payload.itemId) {
      return json({ error: "claimId or itemId is required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const rows = await claimPendingEmails(admin, user.id, payload);
    if (rows.length === 0) {
      return json({ sent: 0, skipped: "no_recipients" });
    }

    const origin = Deno.env.get("SITE_URL") || "https://campusfind.vercel.app";
    let sent = 0;
    const failedIds: string[] = [];

    for (const row of rows) {
      const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(row.user_id);
      const email = recipient?.user?.email;
      if (recipientError || !email) {
        failedIds.push(row.id);
        continue;
      }

      const template = TEMPLATES[row.kind];
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `CampusFind: ${row.title}`,
          html: renderEmail({
            heading: template.heading,
            body: row.message,
            href: `${origin}${template.hrefPath(row)}`,
          }),
        }),
      });

      if (resendRes.ok) sent += 1;
      else failedIds.push(row.id);
    }

    // Let a later call retry anything that didn't go out.
    if (failedIds.length > 0) {
      await admin.from("notifications").update({ emailed_at: null }).in("id", failedIds);
    }

    return json({ sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email dispatch failed";
    return json({ error: message }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Finds alerts the caller's own action just created (sender_id = caller) that have not been
 * emailed yet, and marks them emailed in the same step so concurrent calls can't double-send.
 * Alerts are only written by database triggers on real state changes, so this can't be used
 * to email arbitrary people or to repeat an email.
 */
async function claimPendingEmails(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  payload: Payload,
): Promise<NotificationRow[]> {
  const since = new Date(Date.now() - EMAIL_WINDOW_MS).toISOString();

  let candidates = admin
    .from("notifications")
    .select("id")
    .eq("sender_id", actorId)
    .eq("kind", payload.kind)
    .is("emailed_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_EMAILS_PER_CALL);

  if (payload.claimId) candidates = candidates.eq("related_claim_id", payload.claimId);
  if (payload.itemId) candidates = candidates.eq("related_item_id", payload.itemId);

  const { data: found, error } = await candidates;
  if (error || !found || found.length === 0) return [];

  const { data: claimed, error: claimError } = await admin
    .from("notifications")
    .update({ emailed_at: new Date().toISOString() })
    .in("id", found.map((row) => row.id))
    .is("emailed_at", null)
    .select("id, user_id, title, message, related_item_id, kind");

  if (claimError || !claimed) return [];
  return (claimed as NotificationRow[]).filter((row) => row.user_id !== actorId);
}

function renderEmail({ heading, body, href }: { heading: string; body: string; href: string }) {
  const safeHeading = escapeHtml(heading);
  const safeBody = escapeHtml(body);
  const safeHref = escapeHtml(href);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f1ea;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1917;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;">
      <tr><td style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#78716c;">CampusFind</td></tr>
      <tr><td style="padding-top:12px;font-size:22px;font-weight:650;">${safeHeading}</td></tr>
      <tr><td style="padding-top:12px;font-size:15px;line-height:1.55;color:#44403c;">${safeBody}</td></tr>
      <tr><td style="padding-top:22px;">
        <a href="${safeHref}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;border-radius:999px;padding:12px 18px;font-size:14px;">Open CampusFind</a>
      </td></tr>
      <tr><td style="padding-top:22px;font-size:12px;color:#a8a29e;">You received this because you have an SFIT CampusFind account. Alerts also appear in the app.</td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
