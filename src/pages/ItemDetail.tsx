import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ClaimModal } from "@/features/items/components/ClaimModal";
import { ItemCard } from "@/features/items/components/ItemCard";
import { ItemResolutionNotice, type ResolutionKind } from "@/features/items/components/ItemResolutionNotice";
import { ArrowLeft, Check, Share2, X, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchItemDetail } from "@/features/items/services/itemsApi";
import { DetailSkeleton } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { custodyLabel } from "@/features/items/utils/item-custody";
import type { DBClaim } from "@/types/database";

const STATUS_WORD: Record<string, string> = {
  lost: "Lost",
  found: "Found",
  claimed: "Claimed",
  returned: "Returned",
};

const STATUS_TONE: Record<string, string> = {
  lost: "text-rose-600 dark:text-rose-400",
  found: "text-campus",
  claimed: "text-amber-700 dark:text-amber-400",
  returned: "text-sky-700 dark:text-sky-400",
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const routeState = (location.state || {}) as {
    fromClaim?: Partial<DBClaim>;
    itemTitle?: string;
    itemStatus?: string;
    itemCategory?: string;
    itemLocation?: string;
  };

  const { data, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: () => fetchItemDetail(id!),
    enabled: Boolean(id),
  });

  const { data: myClaim } = useQuery({
    queryKey: ["my-claim", id, user?.id],
    enabled: Boolean(id && user),
    queryFn: async () => {
      const { data: claim, error } = await supabase
        .from("claims")
        .select("id, status, message, meeting_details")
        .eq("item_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return claim;
    },
  });

  const resolvedClaim = (myClaim || routeState.fromClaim || null) as Partial<DBClaim> | null;

  const handleClearClaim = async (claimId: string) => {
    if (user) {
      try {
        const stored = localStorage.getItem(`campusfind_dismissed_claims_${user.id}`);
        const dismissed: string[] = stored ? JSON.parse(stored) : [];
        if (!dismissed.includes(claimId)) {
          dismissed.push(claimId);
          localStorage.setItem(`campusfind_dismissed_claims_${user.id}`, JSON.stringify(dismissed));
        }
      } catch {
        // ignore local storage issues
      }
      void supabase.from("claims").delete().eq("id", claimId);
    }
    toast.success("Claim removed from your history");
    await queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    navigate("/dashboard?tab=my-claims");
  };

  useEffect(() => {
    setActiveImage(0);
    setCopied(false);
  }, [id, data?.images?.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!data?.item) {
    let resolutionKind: ResolutionKind = "not_found";
    if (data?.meta?.is_deleted || resolvedClaim) {
      resolutionKind = "removed";
    } else if (data?.meta?.status === "returned" || routeState.itemStatus === "returned") {
      resolutionKind = "returned";
    } else if (data?.meta?.status === "claimed" || routeState.itemStatus === "claimed") {
      resolutionKind = "claimed";
    }

    return (
      <ItemResolutionNotice
        kind={resolutionKind}
        itemId={id}
        itemTitle={data?.meta?.title || routeState.itemTitle || (resolvedClaim?.items?.title as string | undefined)}
        itemCategory={data?.meta?.category || routeState.itemCategory}
        itemLocation={data?.meta?.location || routeState.itemLocation}
        claim={resolvedClaim}
        onClearClaim={resolvedClaim?.id ? handleClearClaim : undefined}
      />
    );
  }

  const { item, images, poster, relatedItems } = data;
  const dateLabel = format(new Date(item.date_occurred || item.created_at), "d MMMM yyyy");
  const isOwner = Boolean(user && user.id === item.user_id);
  const who = isOwner ? "You" : poster;
  const isOriginallyFound = item.status === "found" || Boolean(item.held_where);
  const statusWord =
    item.status === "returned"
      ? (isOriginallyFound ? "Returned" : "Resolved")
      : STATUS_WORD[item.status] ?? item.status;

  const nowLabel = item.status === "found"
    ? custodyLabel(item.held_where, item.held_at, {
        isOwner,
        holderName: poster,
      })
    : null;

  const locationLabel =
    item.status === "lost" ? "Last seen"
      : item.status === "found" ? "Found at"
        : item.held_where ? "Found at"
          : "Last seen";

  const dateLabelName =
    item.status === "lost" ? "Date lost"
      : item.status === "found" ? "Date found"
        : item.held_where ? "Date found"
          : "Date lost";

  const situation =
    item.status === "found" && nowLabel
      ? `${statusWord} · ${nowLabel}`
      : item.status === "lost" && item.location
        ? `Lost · Last seen ${item.location}`
        : item.status === "claimed"
          ? "Claimed · Handover in progress"
          : item.status === "returned" && item.location
            ? `${statusWord} · ${locationLabel} ${item.location}`
            : item.location
              ? `${statusWord} · ${item.location}`
              : statusWord;

  const atDesk = item.status === "found" && item.held_where === "at_desk";
  const canClaim = (item.status === "lost" || item.status === "found") && !atDesk;
  const hero = images[activeImage];
  const actionLabel = item.status === "found" ? "This is mine" : "I found this";

  const specs = [
    item.location ? { label: locationLabel, value: item.location } : null,
    nowLabel ? { label: "Now", value: nowLabel } : null,
    { label: dateLabelName, value: dateLabel },
    { label: "Type", value: item.category },
    { label: "From", value: who },
  ].filter(Boolean) as { label: string; value: string }[];

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied");
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <div className="container py-6 md:py-10">
        <Link
          to="/items"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Items
        </Link>

        {item.status === "returned" && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 text-foreground dark:border-emerald-500/30 dark:bg-emerald-500/[0.08] animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-[13px] leading-relaxed">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Case closed · Reunited.</span> This item was marked as returned to its owner on campus.
            </div>
          </div>
        )}

        {item.status === "claimed" && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-foreground dark:border-amber-500/30 dark:bg-amber-500/[0.08] animate-fade-in">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-[13px] leading-relaxed">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Claim accepted · In handover.</span> The finder and claimant are coordinating campus collection.
            </div>
          </div>
        )}

        <div className="mt-6 grid items-start gap-8 md:mt-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-12 lg:gap-16">
          <div className="animate-scale-in">
            <button
              type="button"
              onClick={() => hero && setLightboxOpen(true)}
              className="group/photo relative block w-full overflow-hidden rounded-[1.75rem] bg-muted ring-1 ring-black/[0.05] dark:ring-white/[0.08]"
              aria-label={hero ? "View photo" : item.title}
            >
              {hero ? (
                <img
                  src={hero}
                  alt={item.title}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-apple group-hover/photo:scale-[1.03] md:aspect-[4/5] md:max-h-[70vh]"
                />
              ) : (
                <div className="flex aspect-[4/5] items-end bg-gradient-to-br from-muted to-secondary p-6 md:max-h-[70vh]">
                  <p className="font-display text-3xl font-semibold capitalize text-foreground/25">{item.category}</p>
                </div>
              )}
              {hero && (
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/90 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover/photo:opacity-100">
                  View
                </span>
              )}
            </button>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto p-2.5">
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-background transition-all duration-300 ease-apple",
                      i === activeImage
                        ? "opacity-100 ring-foreground"
                        : "ring-transparent opacity-45 hover:opacity-80",
                    )}
                  >
                    <img src={url} alt={`Photo ${i + 1} of ${item.title}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p
              className={cn(
                "animate-fade-in text-[13px] font-medium tracking-wide",
                STATUS_TONE[item.status] ?? "text-muted-foreground",
              )}
            >
              {situation}
            </p>
            <h1 className="animate-fade-in mt-2 font-display text-[2.15rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl" style={{ animationDelay: "60ms" }}>
              {item.title}
            </h1>
            {item.description && (
              <p className="animate-fade-in mt-4 max-w-md text-[16px] leading-relaxed text-muted-foreground" style={{ animationDelay: "110ms" }}>
                {item.description}
              </p>
            )}
            {atDesk && (
              <p className="animate-fade-in mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground" style={{ animationDelay: "130ms" }}>
                It’s already at the {item.held_at || "campus"} desk. Ask there — you don’t need to claim it with the poster.
              </p>
            )}

            <dl className="mt-8 border-t border-border/50">
              {specs.map((spec, i) => (
                <div
                  key={spec.label}
                  className="animate-fade-in flex items-baseline justify-between gap-6 border-b border-border/50 py-3.5 transition-colors duration-300 hover:text-foreground"
                  style={{ animationDelay: `${160 + i * 50}ms` }}
                >
                  <dt className="text-[13px] text-muted-foreground">{spec.label}</dt>
                  <dd className="text-right text-[14px] font-medium capitalize tracking-tight">{spec.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex items-center gap-3">
              {canClaim && !isOwner && user && !myClaim && (
                <Button size="lg" className="h-12 flex-1 px-7 sm:flex-none" onClick={() => setClaimOpen(true)}>
                  {actionLabel}
                </Button>
              )}
              {canClaim && !user && (
                <Button size="lg" className="h-12 flex-1 px-7 sm:flex-none" asChild>
                  <Link to="/auth">Sign in to continue</Link>
                </Button>
              )}
              {isOwner && (
                <p className="text-[14px] text-muted-foreground">
                  {item.status === "returned"
                    ? (isOriginallyFound ? "You marked this item as returned." : "You marked this listing as resolved.")
                    : item.status === "claimed"
                      ? "You accepted a claim for this item. Coordinate handover in Dashboard → Incoming."
                      : atDesk
                        ? `You posted this. People collect it from the ${item.held_at || "campus"} desk — no claims. Mark it returned in Dashboard when it’s gone.`
                        : "You posted this. Claims arrive in Dashboard → Inbox."}
                </p>
              )}
              {!isOwner && !myClaim && (item.status === "claimed" || item.status === "returned") && (
                <p className="text-[14px] text-muted-foreground">
                  {item.status === "returned"
                    ? (isOriginallyFound ? "This item has been returned." : "This lost item was recovered.")
                    : "A claim has been accepted for this item. Handover is in progress."}
                </p>
              )}
              {!isOwner && user && myClaim && (
                <p className="text-[14px] text-muted-foreground">
                  {myClaim.status === "pending" && (
                    <>
                      You already sent a note. Waiting on the poster.{" "}
                      <Link to="/dashboard?tab=my-claims" className="underline underline-offset-4">
                        View claim
                      </Link>
                    </>
                  )}
                  {myClaim.status === "approved" && (
                    <>
                      Accepted. {myClaim.meeting_details || "Hand it over in a public campus place."}{" "}
                      <Link to="/dashboard?tab=my-claims" className="underline underline-offset-4">
                        Details
                      </Link>
                    </>
                  )}
                  {myClaim.status === "rejected" && "This claim was declined. Look for another listing."}
                  {myClaim.status === "withdrawn" && "You withdrew your claim on this listing."}
                </p>
              )}
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-[13px] text-muted-foreground transition-colors duration-300 hover:bg-secondary hover:text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {relatedItems.length > 0 && (
        <section className="container pb-8 md:pb-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Similar items</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {relatedItems.map((ri, i) => (
              <div key={ri.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <ItemCard {...ri} />
              </div>
            ))}
          </div>
        </section>
      )}

      {lightboxOpen && hero && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={hero}
            alt={item.title}
            className="max-h-[92vh] max-w-[92vw] object-contain animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
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
          queryClient.invalidateQueries({ queryKey: ["my-claim", id, user?.id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
    </div>
  );
}
