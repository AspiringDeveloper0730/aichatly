
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "info@aichatly.app";
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || ADMIN_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

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
    if (!ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, error: "ADMIN_EMAIL is not configured." },
        { status: 500 }
      );
    }
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Email service is not configured." },
        { status: 500 }
      );
    }

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

    try {
      const submittedAt = new Date().toISOString();
      const subject = `New contact form submission${fullName ? ` from ${fullName}` : ""}`;
      const html = `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; line-height:1.6;">
          <h2 style="margin:0 0 12px 0;">New Contact Submission</h2>
          <p style="margin:0 0 8px 0;"><strong>Name:</strong> ${fullName ? String(fullName) : "Anonymous"}</p>
          <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${email.trim()}</p>
          <p style="margin:0 0 8px 0;"><strong>Submitted at:</strong> ${submittedAt}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
          <p style="margin:0 0 8px 0;"><strong>Message:</strong></p>
          <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;">${String(
            message
          )}</div>
          <p style="color:#6b7280;font-size:12px;margin-top:16px;">Submission key: ${submissionKey}</p>
        </div>
      `;
      const text = [
        "New Contact Submission",
        `Name: ${fullName ? String(fullName) : "Anonymous"}`,
        `Email: ${email.trim()}`,
        `Submitted at: ${submittedAt}`,
        "",
        "Message:",
        String(message),
        "",
        `Submission key: ${submissionKey}`,
      ].join("\n");

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: CONTACT_FROM_EMAIL,
          to: [ADMIN_EMAIL],
          subject,
          html,
          text,
          reply_to: [email.trim()],
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text().catch(() => "");
        console.error("[Contact API] Email send failed:", {
          status: resendResponse.status,
          body: errorText,
        });
        return NextResponse.json(
          { success: false, error: "Failed to send notification email." },
          { status: 500 }
        );
      }
    } catch (mailErr: any) {
      console.error("[Contact API] Unexpected email error:", {
        message: mailErr?.message,
      });
      return NextResponse.json(
        { success: false, error: "Failed to send notification email." },
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
