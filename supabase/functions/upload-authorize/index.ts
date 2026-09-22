import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileRequest {
  name: string;
  type: string;
  size: number;
}

interface UploadRequest {
  itemId: string;
  files: FileRequest[];
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Missing server configuration" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload = (await req.json()) as UploadRequest;
    if (!payload?.itemId || !Array.isArray(payload?.files)) {
      return json({ error: "Invalid request body" }, 400);
    }

    if (payload.files.length > MAX_FILES) {
      return json({ error: `Cannot upload more than ${MAX_FILES} files` }, 400);
    }

    // Verify ownership of the item
    const { data: item, error: itemError } = await userClient
      .from("items")
      .select("user_id")
      .eq("id", payload.itemId)
      .single();

    if (itemError || !item || item.user_id !== user.id) {
      return json({ error: "Item not found or access denied" }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const results = [];

    for (const file of payload.files) {
      if (file.size > MAX_FILE_SIZE) {
        return json({ error: `File ${file.name} exceeds 5MB limit` }, 400);
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return json({ error: `File ${file.name} has unsupported type ${file.type}` }, 400);
      }

      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${user.id}/${payload.itemId}/${crypto.randomUUID()}.${ext}`;
      
      const { data, error } = await adminClient.storage
        .from("item-images")
        .createSignedUploadUrl(path);

      if (error || !data) {
        return json({ error: "Failed to generate upload URL" }, 500);
      }

      results.push({
        name: file.name,
        path,
        token: data.token,
        signedUrl: data.signedUrl,
      });
    }

    return json({ urls: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload authorization failed";
    return json({ error: message }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
