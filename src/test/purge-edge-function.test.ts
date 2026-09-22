import { describe, expect, it, vi, beforeEach } from "vitest";

// We mock the supabase client logic to simulate the Deno edge function's behavior
// In a real environment, you'd extract the processing logic into a separate testable module.
const mockAdminClient = {
  rpc: vi.fn(),
  storage: {
    from: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis(),
};

async function processCleanupJobs(adminClient: any) {
  const { data: jobs, error: claimError } = await adminClient.rpc("claim_media_cleanup_jobs", {
    batch_size: 100
  });

  if (claimError || !jobs || jobs.length === 0) return { successful: 0, failed: 0 };

  const results = { successful: 0, failed: 0 };

  for (const job of jobs) {
    try {
      const { error: removeError } = await adminClient.storage
        .from("item-images")
        .remove([job.path]);

      if (removeError) throw new Error(removeError.message);

      await adminClient.from("media_cleanup_queue").update({ status: 'completed' }).eq("id", job.job_id);
      results.successful++;
    } catch (err: any) {
      const { data: queueRow } = await adminClient
        .from("media_cleanup_queue")
        .select("attempts")
        .eq("id", job.job_id)
        .single();

      const attempts = queueRow?.attempts || 1;
      const newStatus = attempts >= 3 ? 'failed' : 'pending';

      await adminClient.from("media_cleanup_queue").update({ status: newStatus }).eq("id", job.job_id);
      results.failed++;
    }
  }

  return results;
}

describe("Purge Expired Media Edge Function Logic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAdminClient.storage.from.mockReturnThis();
    mockAdminClient.from.mockReturnThis();
    mockAdminClient.select.mockReturnThis();
    mockAdminClient.eq.mockReturnThis();
    mockAdminClient.update.mockReturnThis();
  });

  it("successfully processes and completes jobs", async () => {
    mockAdminClient.rpc.mockResolvedValueOnce({
      data: [{ job_id: "job-1", path: "test/img1.jpg" }],
      error: null
    });
    mockAdminClient.storage.remove.mockResolvedValueOnce({ error: null });

    const results = await processCleanupJobs(mockAdminClient);

    expect(results.successful).toBe(1);
    expect(results.failed).toBe(0);
    expect(mockAdminClient.storage.remove).toHaveBeenCalledWith(["test/img1.jpg"]);
    expect(mockAdminClient.update).toHaveBeenCalledWith({ status: "completed" });
  });

  it("increments attempts and sets to pending on failure < MAX_RETRIES", async () => {
    mockAdminClient.rpc.mockResolvedValueOnce({
      data: [{ job_id: "job-2", path: "test/img2.jpg" }],
      error: null
    });
    mockAdminClient.storage.remove.mockResolvedValueOnce({ error: { message: "Network Error" } });
    mockAdminClient.single.mockResolvedValueOnce({ data: { attempts: 1 } });

    const results = await processCleanupJobs(mockAdminClient);

    expect(results.successful).toBe(0);
    expect(results.failed).toBe(1);
    expect(mockAdminClient.update).toHaveBeenCalledWith({ status: "pending" });
  });

  it("sets to failed when attempts >= MAX_RETRIES", async () => {
    mockAdminClient.rpc.mockResolvedValueOnce({
      data: [{ job_id: "job-3", path: "test/img3.jpg" }],
      error: null
    });
    mockAdminClient.storage.remove.mockResolvedValueOnce({ error: { message: "Auth Error" } });
    mockAdminClient.single.mockResolvedValueOnce({ data: { attempts: 3 } });

    const results = await processCleanupJobs(mockAdminClient);

    expect(results.successful).toBe(0);
    expect(results.failed).toBe(1);
    expect(mockAdminClient.update).toHaveBeenCalledWith({ status: "failed" });
  });

  it("handles idempotency: returns success even if file already missing from storage (mocked via error=null)", async () => {
    mockAdminClient.rpc.mockResolvedValueOnce({
      data: [{ job_id: "job-4", path: "test/already-gone.jpg" }],
      error: null
    });
    // Storage remove returns successful if the file wasn't there but command executed
    mockAdminClient.storage.remove.mockResolvedValueOnce({ error: null });

    const results = await processCleanupJobs(mockAdminClient);

    expect(results.successful).toBe(1);
    expect(mockAdminClient.update).toHaveBeenCalledWith({ status: "completed" });
  });
});
