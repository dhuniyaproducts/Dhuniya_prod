/**
 * Cloudinary helper functions for Dhuniya Products
 */

export function getCloudinaryPublicId(url?: string): string | null {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    let path = parts[1];
    // Remove version prefix e.g. v1731688000/
    path = path.replace(/^v\d+\//, "");
    // Remove file extension e.g. .jpg, .png, .webp
    const lastDot = path.lastIndexOf(".");
    if (lastDot !== -1) {
      path = path.substring(0, lastDot);
    }
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

export async function deleteCloudinaryImage(imageUrl?: string): Promise<boolean> {
  const publicId = getCloudinaryPublicId(imageUrl);
  if (!publicId) return false;

  try {
    const res = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, imageUrl }),
    });
    if (!res.ok) {
      console.warn("Cloudinary delete request returned non-OK:", res.status);
      return false;
    }
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Failed to delete Cloudinary image:", err);
    return false;
  }
}

/**
 * Optimizes an image URL for fast mobile & web loading.
 * Automatically serves modern WebP/AVIF formats and resizes high-res images.
 */
export function optimizeImageUrl(url?: string, width = 600): string {
  if (!url || typeof url !== "string") return "";
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    if (!url.includes("f_auto")) {
      return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
  }
  return url;
}
