import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
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
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dedupeFiles, MAX_ITEM_IMAGES, validateItemImage } from "@/lib/item-validation";

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
  const [dateOccurred, setDateOccurred] = useState<Date>();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nextPreviews = images.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [images]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const combinedFiles = dedupeFiles([...images, ...files]);

    if (combinedFiles.length > MAX_ITEM_IMAGES) {
      toast.error(`Maximum ${MAX_ITEM_IMAGES} images allowed`);
      e.target.value = "";
      return;
    }

    for (const file of files) {
      const validationError = validateItemImage(file);

      if (validationError) {
        toast.error(validationError);
        e.target.value = "";
        return;
      }
    }

    setImages(combinedFiles);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((currentImages) => currentImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 3 || !category) {
      toast.error("Add a title with at least 3 characters and choose a category.");
      return;
    }

    setLoading(true);

    try {
      const { data: item, error } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          title: trimmedTitle,
          description: trimmedDescription || null,
          category: category as never,
          location: location || null,
          status: itemType as never,
          date_occurred: dateOccurred ? format(dateOccurred, "yyyy-MM-dd") : null,
          contact_email: user.email ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      const failedUploads: string[] = [];

      for (const file of images) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${item.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("item-images").upload(path, file);
        if (uploadError) {
          failedUploads.push(file.name);
          continue;
        }

        const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);
        await supabase.from("item_images").insert({
          item_id: item.id,
          storage_path: path,
          url: urlData.publicUrl,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home"] }),
        queryClient.invalidateQueries({ queryKey: ["browse-items"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);

      if (failedUploads.length > 0) {
        toast.warning(`Item posted, but ${failedUploads.length} image upload(s) failed.`);
      }

      toast.success("Item posted successfully!");
      navigate(`/items/${item.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Report an Item</CardTitle>
          <CardDescription>Help your campus community by reporting a lost or found item.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={itemType} onValueChange={(v) => setItemType(v as "lost" | "found")} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lost">🔍 I Lost Something</TabsTrigger>
              <TabsTrigger value="found">📦 I Found Something</TabsTrigger>
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
                <Label>Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger><SelectValue placeholder="Where?" /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date {itemType === "lost" ? "Lost" : "Found"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateOccurred && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOccurred ? format(dateOccurred, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateOccurred} onSelect={setDateOccurred} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Photos (max 5)</Label>
              <div className="flex flex-wrap gap-3">
                {previews.map((preview, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_ITEM_IMAGES && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-5 w-5" />
                      <span className="text-[10px]">Add</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-hero" size="lg" disabled={loading}>
              {loading ? "Posting..." : `Post ${itemType === "lost" ? "Lost" : "Found"} Item`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
