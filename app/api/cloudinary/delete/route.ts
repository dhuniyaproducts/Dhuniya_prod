import { NextResponse } from "next/server";

// Cloudflare Workers and Node.js compatible SHA-1 hex digest using Web Crypto
async function sha1Hex(str: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-1", enc.encode(str));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const publicId = body.publicId;

    if (!publicId) {
      return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey =
      process.env.CLOUDINARY_API_KEY ||
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName) {
      return NextResponse.json(
        { error: "Cloudinary cloud name is not configured" },
        { status: 500 }
      );
    }

    if (!apiKey || !apiSecret) {
      // If credentials are not set, return graceful warning so caller does not crash
      console.warn(
        "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required for deleting images from Cloudinary storage."
      );
      return NextResponse.json(
        {
          success: false,
          warning: "Cloudinary API key or secret not set in environment variables.",
        },
        { status: 200 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Cloudinary signature requires params in alphabetical order
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1Hex(toSign);

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (data.result === "ok") {
      return NextResponse.json({ success: true, result: "ok" });
    } else {
      return NextResponse.json(
        { success: false, result: data.result || "not found or already deleted" },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error("Error destroying Cloudinary image:", err);
    return NextResponse.json(
      { error: err.message || "Failed to destroy image" },
      { status: 500 }
    );
  }
}
