import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ClaimModal } from "@/features/items/components/ClaimModal";
import { STATUS_COLORS } from "@/constants";
import { ItemCard } from "@/features/items/components/ItemCard";
import { MapPin, Calendar, Tag, ArrowLeft, Share2, User, CheckCircle2, Maximize2, Lock, ArrowRight, X, Hand } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchItemDetail } from "@/features/items/services/itemsApi";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: () => fetchItemDetail(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    setActiveImage(0);
  }, [id, data?.images?.length]);

  if (isLoading) return <div className="container py-12"><div className="h-96 animate-pulse rounded-3xl bg-muted" /></div>;
  if (!data?.item) return <div className="container py-16 text-center"><p className="text-[15px] text-muted-foreground">Item not found.</p></div>;

  const { item, images, poster, relatedItems } = data;
  const statusStyle = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS];
  const formattedDate = item.date_occurred
    ? format(new Date(item.date_occurred), "MMM d, yyyy")
    : format(new Date(item.created_at), "MMM d, yyyy");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:pt-8 md:pb-6 lg:px-8">
      {/* ========================================================================= */}
      {/* MOBILE LAYOUT (< md)                                                      */}
      {/* ========================================================================= */}
      <div className="mx-auto flex w-full max-w-[420px] flex-col md:hidden pb-10">
        {/* Back navigation - flush with content grid */}
        <div className="mb-4">
          <Link
            to="/items"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground/75 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to items</span>
          </Link>
        </div>

        {/* Main Photo with Subtle Expand Control */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/30 shadow-sm">
          {images.length > 0 ? (
            <>
              <img
                src={images[activeImage]}
                alt={item.title}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md transition-all hover:bg-black/60 active:scale-95 border border-white/10"
                aria-label="Enlarge photo"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-secondary font-display text-sm uppercase tracking-[0.18em] text-muted-foreground">
              No photo
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border transition-all ${
                  i === activeImage
                    ? "border-primary ring-1 ring-primary"
                    : "border-border/40 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Top Information Hierarchy: Eyebrow -> Title -> Divider -> Description */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                item.status === "lost"
                  ? "bg-destructive"
                  : item.status === "found"
                  ? "bg-emerald-500"
                  : item.status === "claimed"
                  ? "bg-warning"
                  : "bg-primary"
              }`}
            />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
              {statusStyle?.label || item.status} Item
            </span>
          </div>

          <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight text-foreground leading-[1.15]">
            {item.title}
          </h1>

          {item.description && (
            <div className="mt-3 border-t border-border dark:border-border/40 pt-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                Description
              </p>
              <p className="mt-0.5 text-[14px] font-normal leading-normal text-foreground/90">
                {item.description}
              </p>
            </div>
          )}
        </div>

        {/* Coherent Metadata Information System (Snug & compact) */}
        <div className="mt-6 rounded-2xl border border-border/80 dark:border-border/40 bg-muted/40 dark:bg-card/40 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
            {/* Location */}
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                  Location
                </p>
                <p className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">
                  {item.location || "Not specified"}
                </p>
              </div>
            </div>

            {/* Date Reported */}
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                  Date Reported
                </p>
                <p className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">
                  {formattedDate}
                </p>
              </div>
            </div>

            {/* Subtle Hairline Row Separator */}
            <div className="col-span-2 border-t border-border/80 dark:border-border/30" />

            {/* Category */}
            <div className="flex items-start gap-2.5">
              <Tag className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                  Category
                </p>
                <p className="mt-0.5 truncate text-[13.5px] font-medium capitalize text-foreground">
                  {item.category}
                </p>
              </div>
            </div>

            {/* Reported By */}
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                  Reported By
                </p>
                <p className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">
                  {user?.id === item.user_id ? "You" : poster}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="mt-7">
          {user && user.id !== item.user_id && (item.status === "found" || item.status === "lost") && (
            <Button
              size="lg"
              className="h-12 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium text-[14.5px] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              onClick={() => setClaimOpen(true)}
            >
              <Hand className="h-4 w-4 shrink-0" />
              <span>{item.status === "found" ? "This is mine — Claim Item" : "I found this item"}</span>
            </Button>
          )}
          {!user && (item.status === "found" || item.status === "lost") && (
            <Button
              size="lg"
              className="h-12 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium text-[14.5px] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              asChild
            >
              <Link to="/auth">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Sign in to claim this item</span>
              </Link>
            </Button>
          )}
          {user && user.id === item.user_id && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-secondary/30 py-3 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>You created this report</span>
            </div>
          )}
          {item.status !== "found" && item.status !== "lost" && (
            <div className="rounded-xl border border-border/50 bg-secondary/30 py-3 text-center text-sm font-medium text-muted-foreground capitalize">
              Status: {item.status}
            </div>
          )}

          {!user && (item.status === "found" || item.status === "lost") && (
            <p className="mx-auto mt-2.5 max-w-[260px] text-center text-[11px] leading-relaxed text-muted-foreground/60">
              Sign in to contact the reporter and claim this item.
            </p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAPTOP / DESKTOP LAYOUT (>= md)                                           */}
      {/* ========================================================================= */}
      <div className="hidden md:block">
        <Button variant="ghost" size="sm" asChild className="mb-6 text-[13px] text-muted-foreground hover:text-foreground">
          <Link to="/items"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to items</Link>
        </Button>

        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Image Showcase */}
          <div className="lg:col-span-5">
            <div className="relative aspect-square w-full max-h-[460px] overflow-hidden rounded-3xl border border-border/60 bg-muted shadow-sm">
              {images.length > 0 ? (
                <>
                  <img src={images[activeImage]} alt={item.title} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform hover:scale-105"
                    aria-label="Expand photo"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex h-full items-center justify-center bg-secondary font-display text-sm uppercase tracking-[0.18em] text-muted-foreground">
                  No photo
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl transition-all ${
                      i === activeImage ? "ring-2 ring-primary ring-offset-2" : "opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Studio Info Panel (Snug & proportionate, max-w-[460px]) */}
          <div className="flex flex-col gap-4 lg:col-span-7 max-w-[460px]">
            {/* Header: Dot + Status, Share button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    item.status === "lost"
                      ? "bg-destructive"
                      : item.status === "found"
                      ? "bg-emerald-500"
                      : item.status === "claimed"
                      ? "bg-warning"
                      : "bg-primary"
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {statusStyle?.label || item.status} Item
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard");
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </Button>
            </div>

            {/* Title & Description with Thin Divider */}
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {item.title}
              </h1>
              {item.description && (
                <div className="mt-3.5 border-t border-border dark:border-border/40 pt-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                    Description
                  </p>
                  <p className="mt-0.5 text-[14.5px] font-normal leading-normal text-foreground/90">
                    {item.description}
                  </p>
                </div>
              )}
            </div>

            {/* Info Box: Snug, properly proportioned, thin border separator */}
            <div className="mt-1 overflow-hidden rounded-2xl border border-border/80 dark:border-border/40 bg-muted/40 dark:bg-card/40 p-4 sm:p-4.5 shadow-sm">
              {/* Row 1: Location & Date Reported */}
              <div className="grid grid-cols-2 gap-x-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">LOCATION</p>
                    <p className="mt-0.5 text-[14px] font-medium text-foreground">{item.location || "Not specified"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">DATE REPORTED</p>
                    <p className="mt-0.5 text-[14px] font-medium text-foreground">{formattedDate}</p>
                  </div>
                </div>
              </div>

              {/* Thin Divider Line */}
              <div className="my-4 border-t border-border/80 dark:border-border/30" />

              {/* Row 2: Category & Reported By */}
              <div className="grid grid-cols-2 gap-x-6">
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">CATEGORY</p>
                    <p className="mt-0.5 text-[14px] font-medium capitalize text-foreground">{item.category}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">REPORTED BY</p>
                    <p className="mt-0.5 text-[14px] font-medium text-foreground">{user?.id === item.user_id ? "You" : poster}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button & Subtext */}
            <div className="mt-1">
              {user && user.id !== item.user_id && (item.status === "found" || item.status === "lost") && (
                <Button
                  size="lg"
                  className="h-12 w-full rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-white/90 shadow-sm text-[14px] sm:text-[15px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  onClick={() => setClaimOpen(true)}
                >
                  <Hand className="h-4 w-4 shrink-0" />
                  <span>{item.status === "found" ? "This is mine — Claim Item" : "I found this item"}</span>
                </Button>
              )}
              {!user && (item.status === "found" || item.status === "lost") && (
                <Button
                  size="lg"
                  className="h-12 w-full rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-white/90 shadow-sm text-[14px] sm:text-[15px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  asChild
                >
                  <Link to="/auth">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>Sign in to claim this item</span>
                  </Link>
                </Button>
              )}
              {user && user.id === item.user_id && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-secondary/40 py-3 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>You created this report</span>
                </div>
              )}
              {item.status !== "found" && item.status !== "lost" && (
                <div className="rounded-2xl border border-border/70 bg-secondary/40 py-3 text-center text-sm font-medium text-muted-foreground capitalize">
                  Status: {item.status}
                </div>
              )}

              {!user && (item.status === "found" || item.status === "lost") && (
                <p className="mx-auto mt-2.5 max-w-[280px] text-center text-[11px] leading-relaxed text-muted-foreground/60">
                  Sign in to contact the reporter and claim this item.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close photo"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={images[activeImage]}
            alt={item.title}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Related items (Desktop only) */}
      {relatedItems.length > 0 && (
        <section className="hidden md:block mt-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Similar items</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedItems.map((ri) => <ItemCard key={ri.id} {...ri} />)}
          </div>
        </section>
      )}

      <ClaimModal
        open={claimOpen}
        onOpenChange={setClaimOpen}
        itemId={item.id}
        itemTitle={item.title}
        itemOwnerId={item.user_id}
        itemStatus={item.status}
        onClaimed={() => {
          queryClient.invalidateQueries({ queryKey: ["item", id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
    </div>
  );
}
