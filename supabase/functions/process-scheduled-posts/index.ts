import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_SERVER_URL = Deno.env.get("BOT_SERVER_URL")!; // e.g. "http://your-vps:8000"
const BOT_SERVER_SECRET = Deno.env.get("BOT_SERVER_SECRET") || "";
const FUNCTION_SECRET =
  Deno.env.get("FUNCTION_SECRET") || SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Group {
  id: string;
  url: string;
}

interface GroupResult {
  group_url: string;
  success: boolean;
  error?: string;
}

interface BotResponse {
  results: GroupResult[];
  updated_session_state?: Record<string, unknown>;
}

function isAuthorizedRequest(req: Request) {
  const authorization = req.headers.get("Authorization");
  const apikey = req.headers.get("apikey");
  const validSecrets = [
    Deno.env.get("FUNCTION_SECRET"),
    SUPABASE_SERVICE_ROLE_KEY,
  ].filter((value): value is string => Boolean(value));

  return validSecrets.some(
    (secret) =>
      authorization === `Bearer ${secret}` ||
      authorization === secret ||
      apikey === secret,
  );
}

Deno.serve(async (req) => {
  // Allow either the dedicated function secret or the service role key.
  if (FUNCTION_SECRET && !isAuthorizedRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Find all posts that are due
  const { data: duePosts, error: fetchError } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString());

  if (fetchError) {
    console.error("Error fetching due posts:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
    });
  }

  if (!duePosts || duePosts.length === 0) {
    return new Response(JSON.stringify({ message: "No posts due" }), {
      status: 200,
    });
  }

  const results = [];

  for (const post of duePosts) {
    // Mark as processing
    await supabase
      .from("scheduled_posts")
      .update({ status: "processing" })
      .eq("id", post.id);

    try {
      // Fetch account credentials
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("email, password, session_state")
        .eq("id", post.account_id)
        .single();

      if (accountError || !account) {
        throw new Error(`Account not found: ${accountError?.message}`);
      }

      // Fetch group URLs for this post
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id, url")
        .in("id", post.group_ids);

      if (groupsError || !groups || groups.length === 0) {
        throw new Error(`Groups not found: ${groupsError?.message}`);
      }

      // Call the bot server
      const botPayload = {
        account_email: account.email,
        account_password: account.password,
        session_state: account.session_state,
        groups: (groups as Group[]).map((g) => ({ url: g.url })),
        content: post.content,
        image_url: post.image_url,
      };

      const botResponse = await fetch(`${BOT_SERVER_URL}/execute-post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(BOT_SERVER_SECRET
            ? { Authorization: `Bearer ${BOT_SERVER_SECRET}` }
            : {}),
        },
        body: JSON.stringify(botPayload),
      });

      if (!botResponse.ok) {
        const errText = await botResponse.text();
        throw new Error(`Bot server error ${botResponse.status}: ${errText}`);
      }

      const botResult: BotResponse = await botResponse.json();

      // Update session state if returned
      if (botResult.updated_session_state) {
        await supabase
          .from("accounts")
          .update({ session_state: botResult.updated_session_state })
          .eq("id", post.account_id);
      }

      // Determine overall status
      const allSucceeded = botResult.results.every((r) => r.success);
      const anySucceeded = botResult.results.some((r) => r.success);

      await supabase
        .from("scheduled_posts")
        .update({
          status: allSucceeded
            ? "completed"
            : anySucceeded
              ? "completed"
              : "failed",
          result: botResult.results,
        })
        .eq("id", post.id);

      results.push({ post_id: post.id, status: "processed", botResult });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      console.error(`Error processing post ${post.id}:`, errorMessage);

      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          result: { error: errorMessage },
        })
        .eq("id", post.id);

      results.push({ post_id: post.id, status: "failed", error: errorMessage });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
