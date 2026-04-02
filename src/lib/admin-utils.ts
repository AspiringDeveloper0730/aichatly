
import { supabase } from "@/integrations/supabase/client";

/**
 * Get user's admin status by checking the user_roles table
 * @param userId - The user's ID to check
 * @returns true if user has admin role, false otherwise
 */
export async function getUserAdminStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin role:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error in getUserAdminStatus:", error);
    return false;
  }
}
