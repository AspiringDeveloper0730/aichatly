
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "admin@aichatly.app";

function getSupabaseAdmin() {
  // For inserts that bypass RLS, we need the service role key
  const url = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL || "";
  const serviceKey = process.env.SUPABASE_ROLE_KEY || "";
  
  if (!url) {
    console.error("[Contact API] Missing DATABASE_URL or NEXT_PUBLIC_DATABASE_URL");
    throw new Error("Database URL is not configured.");
  }
  
  if (!serviceKey) {
    console.error("[Contact API] Missing DATABASE_SERVICE_ROLE_KEY - required for inserting contact submissions");
    throw new Error("Service role key is required for contact form submissions. Please configure DATABASE_SERVICE_ROLE_KEY.");
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[Contact API] JSON parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid request format." },
        { status: 400 }
      );
    }
    
    const { fullName, email, message } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message is required." },
        { status: 400 }
      );
    }

    const submissionKey = `contact_submission_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.from("site_content").insert({
      content_key: submissionKey,
      content_type: "custom",
      title_en: fullName ? `Feedback from: ${fullName}` : "Anonymous Feedback",
      title_tr: fullName ? `Geri bildirim: ${fullName}` : "Anonim Geri Bildirim",
      content_en: message.trim(),
      content_tr: message.trim(),
      metadata: {
        type: "contact_submission",
        admin_email: ADMIN_EMAIL,
        full_name: fullName || null,
        sender_email: email.trim(),
        submitted_at: new Date().toISOString(),
      },
      is_active: true,
      display_order: 0,
    });

    if (error) {
      console.error("[Contact API] DB insert error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      
      // Provide more specific error message
      let errorMessage = "Failed to save your message. Please try again.";
      if (error.code === "PGRST116") {
        errorMessage = "The contact form is temporarily unavailable. Please try again later.";
      } else if (error.message?.includes("permission") || error.message?.includes("policy")) {
        errorMessage = "Permission denied. Please check your configuration.";
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Contact API] Unexpected error:", {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    });
    
    // Provide more specific error message based on error type
    let errorMessage = "An unexpected error occurred.";
    if (err?.message?.includes("credentials")) {
      errorMessage = "Server configuration error. Please contact support.";
    } else if (err?.message) {
      errorMessage = err.message;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
