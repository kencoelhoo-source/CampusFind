import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimModal } from "@/components/ClaimModal";
import { STATUS_COLORS } from "@/lib/constants";
import { ItemCard } from "@/components/ItemCard";
import { MapPin, Calendar, Tag, ArrowLeft, Hand } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchItemDetail } from "@/lib/item-data";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: () => fetchItemDetail(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    setActiveImage(0);
  }, [id, data?.images?.length]);

  if (isLoading) return <div className="container py-12"><div className="h-96 animate-pulse rounded-2xl bg-muted" /></div>;
  if (!data?.item) return <div className="container py-12 text-center"><p className="text-[15px] text-muted-foreground">Item not found.</p></div>;

  const { item, images, poster, relatedItems } = data;

  const statusStyle = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS];

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6 text-[13px] text-muted-foreground hover:text-foreground">
        <Link to="/items"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to items</Link>
      </Button>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
            {images.length > 0 ? (
              <img src={images[activeImage]} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">📦</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((url, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl transition-all ${i === activeImage ? "ring-2 ring-primary ring-offset-2" : "opacity-50 hover:opacity-100"}`}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{item.title}</h1>
          {item.description && <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">{item.description}</p>}

          <Card className="mt-6 rounded-2xl border-0 shadow-card">
            <CardContent className="grid grid-cols-2 gap-5 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Category</p>
                  <p className="mt-0.5 text-[14px] font-medium capitalize text-foreground">{item.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Location</p>
                  <p className="mt-0.5 text-[14px] font-medium text-foreground">{item.location || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</p>
                  <p className="mt-0.5 text-[14px] font-medium text-foreground">{item.date_occurred ? format(new Date(item.date_occurred), "MMM d, yyyy") : "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                  <Hand className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Posted by</p>
                  <p className="mt-0.5 text-[14px] font-medium text-foreground">{user?.id === item.user_id ? "You" : poster}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user && user.id !== item.user_id && item.status === "found" && (
            <Button className="mt-6 h-12 w-full rounded-full bg-gradient-hero text-[15px] font-semibold text-white shadow-none hover:opacity-90" size="lg" onClick={() => setClaimOpen(true)}>
              This is mine — Claim Item
            </Button>
          )}
          {!user && item.status === "found" && (
            <Button className="mt-6 h-12 w-full rounded-full text-[15px] font-medium" size="lg" variant="outline" asChild>
              <Link to="/auth">Sign in to claim this item</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Related items */}
      {relatedItems.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">Similar Items</h2>
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
        onClaimed={() => {
          queryClient.invalidateQueries({ queryKey: ["item", id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
    </div>
  );
}
