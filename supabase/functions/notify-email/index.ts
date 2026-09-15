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

interface OutboundMail {
  toUserId: string;
  subject: string;
  heading: string;
  body: string;
  hrefPath: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return json({ sent: 0, skipped: "email_not_configured" });
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
    if (!payload?.kind) {
      return json({ error: "kind is required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const mails = await buildMails(admin, user.id, payload);
    if (mails.length === 0) {
      return json({ sent: 0, skipped: "no_recipients" });
    }

    const origin = Deno.env.get("SITE_URL") || "https://campusfind.vercel.app";
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "CampusFind <beth.t@example.com>";

    let sent = 0;
    for (const mail of mails) {
      const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(mail.toUserId);
      const email = recipient?.user?.email;
      if (recipientError || !email) continue;

      const html = renderEmail({
        heading: mail.heading,
        body: mail.body,
        href: `${origin}${mail.hrefPath}`,
      });

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: mail.subject,
          html,
        }),
      });

      if (resendRes.ok) sent += 1;
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

async function buildMails(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  payload: Payload,
): Promise<OutboundMail[]> {
  if (payload.claimId) {
    const { data: claim, error } = await admin
      .from("claims")
      .select("id, item_id, user_id, message, status, meeting_details, items(title, user_id, status)")
      .eq("id", payload.claimId)
      .maybeSingle();

    if (error || !claim) return [];

    const item = Array.isArray(claim.items) ? claim.items[0] : claim.items;
    if (!item) return [];

    const ownerId = item.user_id as string;
    const claimantId = claim.user_id as string;
    const title = String(item.title || "Item");
    const isOwner = actorId === ownerId;
    const isClaimant = actorId === claimantId;
    if (!isOwner && !isClaimant) return [];

    const preview = String(claim.message || "").slice(0, 160);

    switch (payload.kind) {
      case "claim_submitted":
        if (!isClaimant) return [];
        return [
          {
            toUserId: ownerId,
            subject: `CampusFind: new claim on "${title}"`,
            heading: "Someone contacted you about a listing",
            body: `A student wrote: "${preview}". Open CampusFind to accept or decline in Inbox.`,
            hrefPath: "/dashboard?tab=incoming",
          },
        ];
      case "claim_approved":
        if (!isOwner) return [];
        return [
          {
            toUserId: claimantId,
            subject: `CampusFind: claim accepted for "${title}"`,
            heading: "Your claim was accepted",
            body: claim.meeting_details
              ? `Meetup: ${claim.meeting_details}`
              : "Meet in a public campus spot. Details are in your Claims tab.",
            hrefPath: "/dashboard?tab=my-claims",
          },
        ];
      case "claim_rejected":
        if (!isOwner) return [];
        return [
          {
            toUserId: claimantId,
            subject: `CampusFind: claim declined for "${title}"`,
            heading: "Your claim was declined",
            body: `The poster declined your claim for "${title}". You can look for another listing.`,
            hrefPath: "/dashboard?tab=my-claims",
          },
        ];
      case "claim_withdrawn":
        if (!isClaimant) return [];
        return [
          {
            toUserId: ownerId,
            subject: `CampusFind: a claim was withdrawn on "${title}"`,
            heading: "A claim was withdrawn",
            body: `The student withdrew their claim on "${title}".`,
            hrefPath: "/dashboard?tab=incoming",
          },
        ];
      case "meetup_updated": {
        const toUserId = isOwner ? claimantId : ownerId;
        return [
          {
            toUserId,
            subject: `CampusFind: meetup updated for "${title}"`,
            heading: "Meetup details changed",
            body: claim.meeting_details
              ? `New details: ${claim.meeting_details}`
              : "Open CampusFind to see the updated meetup note.",
            hrefPath: isOwner ? "/dashboard?tab=my-claims" : "/dashboard?tab=incoming",
          },
        ];
      }
      default:
        break;
    }
  }

  if (payload.itemId && (payload.kind === "item_returned" || payload.kind === "item_deleted" || payload.kind === "possible_match" || payload.kind === "claim_superseded")) {
    const { data: item, error } = await admin
      .from("items")
      .select("id, title, user_id, status")
      .eq("id", payload.itemId)
      .maybeSingle();

    if (error || !item) return [];

    if (payload.kind === "possible_match") {
      if (item.user_id !== actorId) return [];
      const { data: notes } = await admin
        .from("notifications")
        .select("user_id")
        .eq("related_item_id", item.id)
        .eq("kind", "possible_match")
        .gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

      const recipients = Array.from(new Set((notes || []).map((row) => row.user_id).filter((id) => id && id !== actorId)));
      return recipients.map((toUserId) => ({
        toUserId,
        subject: `CampusFind: possible match for "${item.title}"`,
        heading: "A listing may match yours",
        body: `Someone posted "${item.title}". Open it on CampusFind if it looks like your item.`,
        hrefPath: `/items/${item.id}`,
      }));
    }

    if (item.user_id !== actorId) return [];

    const { data: claims } = await admin
      .from("claims")
      .select("id, user_id, status")
      .eq("item_id", item.id);

    if (payload.kind === "claim_superseded") {
      const others = (claims || []).filter((claim) => claim.status === "rejected" && claim.user_id !== actorId);
      return others.map((claim) => ({
        toUserId: claim.user_id,
        subject: `CampusFind: another claim was accepted for "${item.title}"`,
        heading: "Another claim was accepted",
        body: `The poster accepted a different claim for "${item.title}".`,
        hrefPath: "/dashboard?tab=my-claims",
      }));
    }

    const active = (claims || []).filter((claim) => ["pending", "approved"].includes(claim.status) && claim.user_id !== actorId);
    const heading = payload.kind === "item_returned" ? "Item marked returned" : "Listing removed";
    const body =
      payload.kind === "item_returned"
        ? `The poster marked "${item.title}" as returned.`
        : `The poster removed "${item.title}" from the board.`;

    return active.map((claim) => ({
      toUserId: claim.user_id,
      subject: `CampusFind: ${heading.toLowerCase()} — "${item.title}"`,
      heading,
      body,
      hrefPath: "/dashboard?tab=my-claims",
    }));
  }

  return [];
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
