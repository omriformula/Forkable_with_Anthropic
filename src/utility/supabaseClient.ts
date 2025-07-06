import { createClient } from "@refinedev/supabase";

const SUPABASE_URL = "https://qunnzqndrlodlsuectvn.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1bm56cW5kcmxvZGxzdWVjdHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTg5MDYsImV4cCI6MjA2NjMzNDkwNn0.Ovqh1lk7wczwmWYo72rL2y1mUApfoyhEOzglLMgg4wE";

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: true,
  },
});
