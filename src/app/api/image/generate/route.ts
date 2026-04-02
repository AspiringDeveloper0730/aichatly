import { NextRequest, NextResponse } from "next/server";

interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();
    const { prompt, aspectRatio = "1:1" } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.PREMIUM_USER_VISUAL_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "PREMIUM_USER_VISUAL_KEY is not configured" },
        { status: 500 }
      );
    }

    // Map aspect ratio to DALL-E size format
    // DALL-E 3 supports: "1024x1024", "1792x1024", "1024x1792"
    let size = "1024x1024"; // Default square
    if (aspectRatio === "16:9") {
      size = "1792x1024";
    } else if (aspectRatio === "9:16") {
      size = "1024x1792";
    }

    // Call OpenAI DALL-E API
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "GPT-Image-1",
        prompt: prompt,
        n: 1,
        size: size,
        quality: "medium",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      console.error("[Image Generation API] Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      return NextResponse.json(
        { 
          error: errorData.error?.message || errorData.error || `OpenAI API error: ${response.status}`,
          success: false 
        },
        { status: 400 }
      );
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      return NextResponse.json(
        { error: "No image URL in response", success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: data.data[0].url,
    });
  } catch (error: any) {
    console.error("[Image Generation API] Error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        success: false 
      },
      { status: 500 }
    );
  }
}
