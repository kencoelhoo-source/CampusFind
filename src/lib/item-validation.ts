const MAX_ITEM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ITEM_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const MAX_ITEM_IMAGES = 5;

export function dedupeFiles<T extends { name: string; size: number; lastModified: number }>(files: T[]) {
  const seen = new Set<string>();

  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function validateItemImage(file: Pick<File, "name" | "size" | "type">) {
  if (!ALLOWED_ITEM_IMAGE_TYPES.has(file.type)) {
    return `${file.name} must be a JPG, PNG, or WebP image.`;
  }

  if (file.size > MAX_ITEM_IMAGE_SIZE_BYTES) {
    return `${file.name} exceeds the 5 MB limit.`;
  }

  return null;
}

export function validateClaimMessage(message: string) {
  const trimmedMessage = message.trim();

  if (trimmedMessage.length < 15) {
    return "Provide at least 15 characters so the owner can verify the claim.";
  }

  if (trimmedMessage.length > 500) {
    return "Claim details must stay within 500 characters.";
  }

  return null;
}
