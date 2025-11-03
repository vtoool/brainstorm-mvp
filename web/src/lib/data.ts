import { getMockDataPort } from "@/lib/adapters/mockDataAdapter";
import { getSupabaseDataPort } from "@/lib/adapters/supabaseDataAdapter";
import type { DataPort } from "@/lib/ports/DataPort";

const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const fallbackPort = getMockDataPort();

export const dataPort: DataPort = hasSupabaseEnv ? getSupabaseDataPort() : fallbackPort;
