import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/server";

/**
 * Get the package_tier value from user_quotas table for a given user (client-side)
 * @param userId - The user's ID to get the package tier for
 * @returns The package_tier string if found, null otherwise
 */
export async function getUserPackageTier(
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("user_quotas")
      .select("package_tier")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error getting user package tier:", error);
      return null;
    }

    return data?.package_tier ?? null;
  } catch (error) {
    console.error("Error in getUserPackageTier:", error);
    return null;
  }
}

/**
 * Get the package_tier value from user_quotas table for a given user (server-side)
 * Use this in API routes and server components
 * @param userId - The user's ID to get the package tier for
 * @returns The package_tier string if found, null otherwise
 */
export async function getUserPackageTierServer(
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_quotas")
      .select("package_tier")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error getting user package tier (server):", error);
      return null;
    }

    return data?.package_tier ?? null;
  } catch (error) {
    console.error("Error in getUserPackageTierServer:", error);
    return null;
  }
}
