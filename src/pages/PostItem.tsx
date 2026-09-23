import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, LOCATIONS } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { format } from "date-fns";
import { CalendarIcon, X, Image as ImageIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { dedupeFiles, MAX_ITEM_IMAGES, validateItemImage } from "@/features/items/utils/item-validation";
import { compressMultipleImages } from "@/lib/image-compressor";
import { postItemSchema } from "@/lib/validations/item";
import { notifyEmail } from "@/services/notifications";
import {
  clearPostDraft,
  draftImagesToFiles,
  fileToDraftImage,
  readPostDraft,
  writePostDraft,
} from "@/features/items/utils/post-draft";

export default function PostItem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get("type") === "found" ? "found" : "lost";

  const [itemType, setItemType] = useState<"lost" | "found">(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [heldWhere, setHeldWhere] = useState<"with_me" | "at_desk" | "">("");
  const [heldAt, setHeldAt] = useState("");
  const [dateOccurred, setDateOccurred] = useState<Date>();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const nextPreviews = images.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [images]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const restore = async () => {
      const draft = readPostDraft(user.id);
      if (draft && !cancelled) {
        setItemType(draft.itemType);
        setTitle(draft.title);
        setDescription(draft.description);
        setCategory(draft.category);
        setLocation(draft.location);
        setHeldWhere(draft.heldWhere);
        setHeldAt(draft.heldAt);
        setDateOccurred(draft.dateOccurred ? new Date(draft.dateOccurred) : undefined);
        if (draft.images.length > 0) {
          try {
            const restored = await draftImagesToFiles(draft.images);
            if (!cancelled) setImages(restored);
          } catch {
            // Photos can fail to restore; text still comes back.
          }
        }
      }
      if (!cancelled) setDraftReady(true);
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !draftReady) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        let imageDrafts: { name: string; type: string; dataUrl: string }[] = [];
        try {
          imageDrafts = await Promise.all(images.map((file) => fileToDraftImage(file)));
        } catch {
          imageDrafts = [];
        }
        if (cancelled) return;
        writePostDraft(user.id, {
          itemType,
          title,
          description,
          category,
          location,
          heldWhere,
          heldAt,
          dateOccurred: dateOccurred ? dateOccurred.toISOString() : null,
          images: imageDrafts,
        });
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, draftReady, itemType, title, description, category, location, heldWhere, heldAt, dateOccurred, images]);

  if (!user) {
    return (
      <div className="container max-w-sm py-20 sm:py-28 animate-fade-in">
        <div className="rounded-[22px] border border-black/10 bg-white/95 p-7 sm:p-8 text-center shadow-2xl backdrop-blur-3xl isolate overflow-hidden dark:border-white/[0.12] dark:bg-[#1e1e22]/95 dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)]">
          <Lock className="mx-auto h-7 w-7 stroke-[1.65] text-neutral-800 dark:text-neutral-200" />

          <h1 className="mt-3 font-display text-xl sm:text-2xl font-semibold tracking-[-0.015em] text-neutral-900 dark:text-white">
            Sign in to report an item
          </h1>

          <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-[#98989d]">
            Sign in with your SFIT Google account to post on the board and coordinate returns.
          </p>

          <p className="mt-1 text-center text-[11.5px] tracking-tight text-neutral-400 dark:text-[#787880]">
            @student.sfit.ac.in or @sfit.ac.in
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              size="default"
              className="h-10 w-full rounded-full border border-black/5 bg-neutral-900 px-4 text-[13.5px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-neutral-800 active:scale-[0.98] dark:border-white/[0.12] dark:bg-[#2c2c30] dark:text-white dark:hover:bg-[#38383e] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              asChild
            >
              <Link to="/auth?redirect=/post">
                <svg className="h-4 w-4 shrink-0 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-full rounded-full text-[13px] font-medium text-neutral-500 hover:bg-black/5 hover:text-neutral-900 active:scale-[0.98] dark:text-[#98989d] dark:hover:bg-white/[0.06] dark:hover:text-white transition-colors" asChild>
              <Link to="/items">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    for (const file of files) {
      const validationError = validateItemImage(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    setCompressing(true);
    const toastId = toast.loading("Optimizing photo(s)...");

    try {
      const compressedFiles = await compressMultipleImages(files);
      const combinedFiles = dedupeFiles([...images, ...compressedFiles]);

      if (combinedFiles.length > MAX_ITEM_IMAGES) {
        toast.error(`Maximum ${MAX_ITEM_IMAGES} images allowed`, { id: toastId });
        setCompressing(false);
        return;
      }

      setImages(combinedFiles);
      toast.success("Photo(s) optimized & ready", { id: toastId });
    } catch {
      toast.error("Failed to process images", { id: toastId });
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((currentImages) => currentImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = postItemSchema.safeParse({
      title,
      description,
      category,
      location,
      dateOccurred,
      itemType,
      heldWhere: itemType === "found" ? heldWhere || undefined : undefined,
      heldAt: itemType === "found" && heldWhere === "at_desk" ? heldAt : "",
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || "Please check your form inputs.";
      toast.error(firstError);
      return;
    }

    const validData = validation.data;
    setLoading(true);

    try {
      const { data: item, error } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          title: validData.title,
          description: validData.description || null,
          category: validData.category as never,
          location: validData.location,
          status: validData.itemType as never,
          date_occurred: validData.dateOccurred ? format(validData.dateOccurred, "yyyy-MM-dd") : null,
          held_where: validData.itemType === "found" ? validData.heldWhere ?? null : null,
          held_at:
            validData.itemType === "found" && validData.heldWhere === "at_desk"
              ? validData.heldAt || null
              : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      const failedUploads: string[] = [];

      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const ext = file.name.split(".").pop()?.toLowerCase() || (file.type === "image/webp" ? "webp" : "jpg");
          const targetPath = `${user.id}/${item.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("item-images")
            .upload(targetPath, file, {
              contentType: file.type || "image/webp",
              upsert: false,
            });

          if (uploadError) {
            console.error("Storage upload failed for", file.name, uploadError.message);
            failedUploads.push(file.name);
            continue;
          }

          const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(targetPath);
          const { error: imgDbError } = await supabase.from("item_images").insert({
            item_id: item.id,
            storage_path: targetPath,
            url: urlData.publicUrl,
          });

          if (imgDbError) {
            console.error("item_images insert failed:", imgDbError.message);
            failedUploads.push(file.name);
          }
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["browse-items"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);

      if (failedUploads.length > 0) {
        toast.warning(`Item posted, but ${failedUploads.length} image upload(s) failed.`);
      }

      void notifyEmail({ kind: "possible_match", itemId: item.id });

      clearPostDraft(user.id);
      toast.dismiss(); // dismiss image optimization toasts so success shows immediately on the next page
      
      navigate(`/items/${item.id}`, { state: { justPosted: true, postType: validData.itemType } });
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message || "Failed to post item";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">New listing</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Report an item</h1>
      <p className="mt-3 text-[15px] text-muted-foreground">A few details are enough. Photos help more than a long story.</p>
      <Card className="mt-8 border-0">
        <CardHeader className="sr-only">
          <CardTitle>Report an item</CardTitle>
          <CardDescription>Help your campus community by reporting a lost or found item.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs
            value={itemType}
            onValueChange={(v) => {
              setItemType(v as "lost" | "found");
              if (v === "lost") {
                setHeldWhere("");
                setHeldAt("");
              }
            }}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lost">I lost something</TabsTrigger>
              <TabsTrigger value="found">I found something</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Blue AirPods Pro Case" maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the item in detail..." rows={4} maxLength={1000} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{itemType === "lost" ? "Last seen" : "Found at"}</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger><SelectValue placeholder="Where?" /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {itemType === "found" && (
              <div className="space-y-3">
                <Label>Where is it now?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHeldWhere("with_me");
                      setHeldAt("");
                    }}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left text-[14px] font-medium transition-colors",
                      heldWhere === "with_me"
                        ? "border-foreground bg-secondary"
                        : "border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    With me
                    <span className="mt-1 block text-[12px] font-normal text-muted-foreground">I’m holding it</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHeldWhere("at_desk");
                      setHeldAt((current) => current || location);
                    }}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left text-[14px] font-medium transition-colors",
                      heldWhere === "at_desk"
                        ? "border-foreground bg-secondary"
                        : "border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    Left at a desk
                    <span className="mt-1 block text-[12px] font-normal text-muted-foreground">Library, class, office</span>
                  </button>
                </div>
                {heldWhere === "at_desk" && (
                  <Select value={heldAt} onValueChange={setHeldAt}>
                    <SelectTrigger><SelectValue placeholder="Which desk?" /></SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Date {itemType === "lost" ? "Lost" : "Found"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateOccurred && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOccurred ? format(dateOccurred, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-visible p-0" align="start">
                  <Calendar mode="single" selected={dateOccurred} onSelect={setDateOccurred} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Photos (max 5)</Label>
              <div className="flex flex-wrap gap-3">
                {previews.map((preview, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-2xl border">
                    <img src={preview} alt="Uploaded preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_ITEM_IMAGES && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-muted-foreground/25 text-muted-foreground transition-colors duration-300 ease-apple hover:border-primary hover:text-primary">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-5 w-5" />
                      <span className="text-[10px]">Add</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading || compressing}>
              {loading ? "Posting..." : compressing ? "Optimizing images..." : `Post ${itemType === "lost" ? "Lost" : "Found"} Item`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
