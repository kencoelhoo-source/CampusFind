const MAX_DRAFT_CHARS = 3_500_000;

export type PostDraftType = "lost" | "found";
export type PostDraftHeld = "with_me" | "at_desk" | "";

export interface PostDraftFields {
  itemType: PostDraftType;
  title: string;
  description: string;
  category: string;
  location: string;
  heldWhere: PostDraftHeld;
  heldAt: string;
  dateOccurred: string | null;
  images: { name: string; type: string; dataUrl: string }[];
}

function draftKey(userId: string) {
  return `campusfind:post-draft:${userId}`;
}

export function readPostDraft(userId: string): PostDraftFields | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostDraftFields;
    if (!parsed || (parsed.itemType !== "lost" && parsed.itemType !== "found")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePostDraft(userId: string, draft: PostDraftFields) {
  if (typeof sessionStorage === "undefined") return;
  const empty =
    !draft.title &&
    !draft.description &&
    !draft.category &&
    !draft.location &&
    !draft.heldWhere &&
    !draft.heldAt &&
    !draft.dateOccurred &&
    draft.images.length === 0;

  if (empty) {
    clearPostDraft(userId);
    return;
  }

  const payload = JSON.stringify(draft);
  if (payload.length > MAX_DRAFT_CHARS) {
    const withoutPhotos = { ...draft, images: [] as PostDraftFields["images"] };
    sessionStorage.setItem(draftKey(userId), JSON.stringify(withoutPhotos));
    return;
  }

  sessionStorage.setItem(draftKey(userId), payload);
}

export function clearPostDraft(userId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(draftKey(userId));
}

export function fileToDraftImage(file: File): Promise<{ name: string; type: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || "image/jpeg",
        dataUrl: String(reader.result || ""),
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function draftImagesToFiles(images: PostDraftFields["images"]): Promise<File[]> {
  const files: File[] = [];
  for (const image of images) {
    if (!image?.dataUrl) continue;
    const response = await fetch(image.dataUrl);
    const blob = await response.blob();
    files.push(new File([blob], image.name || "photo.jpg", { type: image.type || blob.type || "image/jpeg" }));
  }
  return files;
}

export function isPostDraftEmpty(draft: PostDraftFields) {
  return (
    !draft.title &&
    !draft.description &&
    !draft.category &&
    !draft.location &&
    !draft.heldWhere &&
    !draft.heldAt &&
    !draft.dateOccurred &&
    draft.images.length === 0
  );
}
