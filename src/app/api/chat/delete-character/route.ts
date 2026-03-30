import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId, characterId } = await req.json();

    if (!userId || !characterId) {
      return NextResponse.json(
        { error: "Missing userId or characterId" },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_DATABASE_URL ||
      "";
    const serviceRoleKey =
      process.env.SUPABASE_ROLE_KEY ||
      process.env.DATABASE_SERVICE_ROLE_KEY ||
      "";

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find all conversations for this user + character
    const { data: conversations } = await adminClient
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("character_id", characterId);

    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c: any) => c.id);

      // 2. Delete all messages
      await adminClient
        .from("messages")
        .delete()
        .in("conversation_id", convIds);

      // 3. Delete conversations
      await adminClient
        .from("conversations")
        .delete()
        .in("id", convIds);
    }

    // 4. Remove favorites
    await adminClient
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("character_id", characterId);

    // 5. Remove likes
    await adminClient
      .from("likes")
      .delete()
      .eq("user_id", userId)
      .eq("character_id", characterId);

    // 6. Check if user created this character - soft delete if so
    const { data: charData } = await adminClient
      .from("characters")
      .select("creator_id")
      .eq("id", characterId)
      .maybeSingle();

    if (charData && charData.creator_id === userId) {
      await adminClient
        .from("characters")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", characterId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[delete-character] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete character data" },
      { status: 500 }
    );
  }
}
