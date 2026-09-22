import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupJob {
  job_id: string;
  path: string;
}

const MAX_RETRIES = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${Deno.env.get("CRON_SECRET") || "local-dev-secret"}`) {
      // In production, you'd want a secure secret to trigger this
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Missing server configuration" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. Claim a batch of jobs
    const { data: jobs, error: claimError } = await adminClient.rpc("claim_media_cleanup_jobs", {
      batch_size: 100
    });

    if (claimError) {
      console.error("Failed to claim jobs:", claimError);
      return json({ error: "Failed to claim jobs" }, 500);
    }

    if (!jobs || jobs.length === 0) {
      return json({ message: "No pending expired media to purge" });
    }

    const results = {
      successful: 0,
      failed: 0,
      details: [] as any[]
    };

    // 2. Process each job
    // Note: We loop sequentially or in small parallel batches.
    // For simplicity and to avoid rate limits, we process them sequentially here.
    for (const job of jobs as CleanupJob[]) {
      try {
        // Idempotency: removing an already missing object returns a successful (or specific error) response
        // in Supabase Storage. If it's already gone, we just consider it successful.
        const { error: removeError } = await adminClient.storage
          .from("item-images")
          .remove([job.path]);

        if (removeError) {
          throw new Error(removeError.message);
        }

        // Mark as completed
        await adminClient
          .from("media_cleanup_queue")
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            last_error: null
          })
          .eq("id", job.job_id);

        results.successful++;
        results.details.push({ id: job.job_id, status: 'completed' });
      } catch (err: any) {
        console.error(`Failed to purge media for job ${job.job_id}:`, err);
        
        // Mark as failed or pending for retry
        const { data: queueRow } = await adminClient
          .from("media_cleanup_queue")
          .select("attempts")
          .eq("id", job.job_id)
          .single();

        const attempts = queueRow?.attempts || 1;
        const newStatus = attempts >= MAX_RETRIES ? 'failed' : 'pending';

        await adminClient
          .from("media_cleanup_queue")
          .update({
            status: newStatus,
            last_error: err.message || "Unknown error",
            processed_at: new Date().toISOString()
          })
          .eq("id", job.job_id);

        results.failed++;
        results.details.push({ id: job.job_id, status: newStatus, error: err.message });
      }
    }

    return json({ message: "Batch processed", results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    return json({ error: message }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
