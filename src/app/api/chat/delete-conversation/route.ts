import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId, conversationId } = await req.json();

    if (!userId || !conversationId) {
      return NextResponse.json(
        { error: "Missing userId or conversationId" },
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

    // Delete messages first
    await adminClient
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    // Delete conversation
    await adminClient
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[delete-conversation] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
