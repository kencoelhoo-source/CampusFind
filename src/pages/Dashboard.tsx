import { useState, type ReactNode } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Check, Package, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notifyUser } from "@/services/notifications";
import { cn } from "@/lib/utils";
import { DashRowSkeleton } from "@/components/common/Skeletons";
import type { DBItem, DBClaim, DBNotification, DashboardData } from "@/types/database";

const STATUS_WORD: Record<DBItem["status"], string> = {
  lost: "Lost",
  found: "Found",
  claimed: "Claimed",
  returned: "Returned",
};

const STATUS_TONE: Record<DBItem["status"], string> = {
  lost: "text-rose-600 dark:text-rose-400",
  found: "text-campus",
  claimed: "text-amber-700 dark:text-amber-400",
  returned: "text-sky-700 dark:text-sky-400",
};

const CLAIM_WORD: Record<DBClaim["status"], string> = {
  pending: "Waiting",
  approved: "Accepted",
  rejected: "Declined",
};

const CLAIM_TONE: Record<DBClaim["status"], string> = {
  pending: "text-amber-700 dark:text-amber-400",
  approved: "text-campus",
  rejected: "text-muted-foreground",
};

const DASH_TABS = ["my-items", "my-claims", "incoming", "notifications"] as const;
type DashTab = (typeof DASH_TABS)[number];

function tabFromSearch(value: string | null): DashTab {
  return DASH_TABS.includes(value as DashTab) ? (value as DashTab) : "my-items";
}

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [itemsRes, claimsRes, notifsRes] = await Promise.all([
    supabase
      .from("items")
      .select("id, title, status, created_at, user_id, location, category")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("claims")
      .select("id, item_id, user_id, message, status, meeting_details, meeting_requested, items(title, status, user_id)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, title, message, created_at, read, related_item_id, related_claim_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (claimsRes.error) throw claimsRes.error;
  if (notifsRes.error) throw notifsRes.error;

  const myItems = (itemsRes.data as unknown as DBItem[]) || [];
  const itemIds = myItems.map((item) => item.id);

  let incomingClaims: DBClaim[] = [];
  if (itemIds.length > 0) {
    const incomingRes = await supabase
      .from("claims")
      .select("id, item_id, user_id, message, status, meeting_details, meeting_requested")
      .in("item_id", itemIds)
      .order("created_at", { ascending: false });
    if (incomingRes.error) throw incomingRes.error;
    const titleById = new Map(myItems.map((item) => [item.id, item.title]));
    incomingClaims = ((incomingRes.data as unknown as DBClaim[]) || []).map((claim) => ({
      ...claim,
      items: { title: titleById.get(claim.item_id) || "Item", user_id: userId },
    }));
  }

  const imageIds = myItems.map((item) => item.id);
  if (imageIds.length > 0) {
    const { data: images } = await supabase.from("item_images").select("item_id, url").in("item_id", imageIds);
    const imageMap = new Map<string, string>();
    images?.forEach((image) => {
      if (!imageMap.has(image.item_id)) imageMap.set(image.item_id, image.url);
    });
    myItems.forEach((item) => {
      item.image_url = imageMap.get(item.id) || null;
    });
  }

  if (incomingClaims.length > 0) {
    const userIds = Array.from(new Set(incomingClaims.map((claim) => claim.user_id)));
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    if (profilesError) throw profilesError;
    incomingClaims.forEach((claim) => {
      const profile = profiles?.find((item) => item.user_id === claim.user_id);
      if (profile) claim.profiles = { full_name: profile.full_name };
    });
  }

  return {
    myItems,
    myClaims: (claimsRes.data as unknown as DBClaim[]) || [],
    notifications: (notifsRes.data as unknown as DBNotification[]) || [],
    incomingClaims,
  };
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = tabFromSearch(searchParams.get("tab"));
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: Boolean(user),
    retry: 1,
  });

  if (authLoading) {
    return (
      <div className="container py-8 md:py-14">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
        <div className="mt-8 space-y-3">
          <SkeletonList />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const myItems = data?.myItems || [];
  const myClaims = data?.myClaims || [];
  const notifications = data?.notifications || [];
  const incomingClaims = data?.incomingClaims || [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const pendingInbox = incomingClaims.filter((claim) => claim.status === "pending").length;

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["home"] }),
      queryClient.invalidateQueries({ queryKey: ["browse-items"] }),
      queryClient.invalidateQueries({ queryKey: ["item"] }),
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count", user.id] }),
    ]);
  };

  const markNotifRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) {
      toast.error(`Failed to update notification: ${error.message}`);
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count", user.id] }),
    ]);
  };

  const setItemStatus = async (id: string, status: DBItem["status"], successMsg: string) => {
    const { error } = await supabase.from("items").update({ status: status as never }).eq("id", id);
    if (error) {
      toast.error(`Failed to update item: ${error.message}`);
      return;
    }
    toast.success(successMsg);
    await refreshQueries();
  };

  const deleteItem = async (id: string) => {
    setDeleting(true);
    const { data: images, error: imagesError } = await supabase.from("item_images").select("storage_path").eq("item_id", id);
    if (imagesError) {
      setDeleting(false);
      toast.error(`Failed to load item images: ${imagesError.message}`);
      return;
    }

    if (images && images.length > 0) {
      const { error: storageError } = await supabase.storage.from("item-images").remove(images.map((image) => image.storage_path));
      if (storageError) {
        setDeleting(false);
        toast.error(`Failed to delete item images: ${storageError.message}`);
        return;
      }
    }

    const { error } = await supabase.from("items").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      toast.error(`Failed to delete item: ${error.message}`);
      return;
    }

    setPendingDelete(null);
    toast.success("Listing deleted");
    await refreshQueries();
  };

  const resolveIncoming = async (
    claimId: string,
    itemId: string,
    status: "approved" | "rejected",
    meetup?: string,
  ) => {
    const payload: Partial<DBClaim> = { status };
    if (status === "approved" && meetup?.trim()) {
      payload.meeting_details = meetup.trim();
      payload.meeting_requested = true;
    }

    const { error } = await supabase.from("claims").update(payload as never).eq("id", claimId);
    if (error) {
      toast.error(`Failed to update claim: ${error.message}`);
      return;
    }

    if (status === "approved") {
      const { error: itemError } = await supabase.from("items").update({ status: "claimed" as never }).eq("id", itemId);
      if (itemError) {
        toast.error(`Claim updated, but item status failed: ${itemError.message}`);
        return;
      }
    }

    const targetClaim = incomingClaims.find((c) => c.id === claimId);
    if (targetClaim?.user_id) {
      try {
        await notifyUser({
          userId: targetClaim.user_id,
          title: status === "approved" ? `Claim accepted: "${targetClaim.items?.title || "Item"}"` : `Claim declined: "${targetClaim.items?.title || "Item"}"`,
          message: status === "approved"
            ? `Your claim was accepted. ${meetup?.trim() ? meetup.trim() : "Meet in a public campus spot."}`
            : `Your claim for "${targetClaim.items?.title || "Item"}" was declined.`,
          relatedItemId: itemId,
          relatedClaimId: claimId,
        });
      } catch (notifErr) {
        console.warn("Could not dispatch notification to claimant:", notifErr);
      }
    }

    toast.success(status === "approved" ? "Accepted. Arrange the handover on campus." : "Claim declined.");
    await refreshQueries();
  };

  return (
    <div className="container py-8 md:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Account</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link to="/post">Post an item</Link>
        </Button>
      </div>

      {isError ? (
        <div className="tile mt-8 px-6 py-10 text-center">
          <p className="font-display text-xl font-semibold tracking-tight">Couldn’t load your dashboard</p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button className="mt-6" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          const next = tabFromSearch(value);
          setSearchParams(next === "my-items" ? {} : { tab: next }, { replace: true });
        }}
        className="mt-8"
      >
        <div className="sticky top-14 z-30 py-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="my-items" className="px-1 text-[12px] sm:px-3 sm:text-[13px]">
              Posted
              <span className="ml-1 tabular-nums text-[11px] opacity-60">{myItems.length}</span>
            </TabsTrigger>
            <TabsTrigger value="my-claims" className="px-1 text-[12px] sm:px-3 sm:text-[13px]">
              Claims
              <span className="ml-1 tabular-nums text-[11px] opacity-60">{myClaims.length}</span>
            </TabsTrigger>
            <TabsTrigger value="incoming" className="px-1 text-[12px] sm:px-3 sm:text-[13px]">
              Inbox
              {pendingInbox > 0 && (
                <span className="ml-1 tabular-nums text-[11px] text-foreground">{pendingInbox}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="px-1 text-[12px] sm:px-3 sm:text-[13px]">
              Alerts
              {unreadCount > 0 && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="my-items" className="mt-5 space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : myItems.length === 0 ? (
            <EmptyState
              title="Nothing posted yet"
              text="Report something lost or found. It shows up on the board and here."
              action={
                <Button asChild>
                  <Link to="/post">Post an item</Link>
                </Button>
              }
            />
          ) : (
            myItems.map((item) => {
              const action =
                item.status === "lost" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-full md:w-auto"
                    onClick={() => setItemStatus(item.id, "returned", "Marked as resolved")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Resolved
                  </Button>
                ) : item.status === "found" || item.status === "claimed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-full md:w-auto"
                    onClick={() => setItemStatus(item.id, "returned", "Marked as returned")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Returned
                  </Button>
                ) : item.status === "returned" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-9 w-full md:w-auto">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reopen
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setItemStatus(item.id, "lost", "Reopened as lost")}>
                        Reopen as lost
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemStatus(item.id, "found", "Reopened as found")}>
                        Reopen as found
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null;

              return (
                <article key={item.id} className="tile px-3 py-3 sm:px-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Link
                      to={`/items/${item.id}`}
                      className="relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-end bg-gradient-to-br from-muted to-secondary p-2">
                          <Package className="h-4 w-4 text-muted-foreground/70" />
                        </div>
                      )}
                    </Link>

                    <Link to={`/items/${item.id}`} className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-[1.15rem] font-semibold tracking-tight">{item.title}</h2>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        <span className={STATUS_TONE[item.status]}>{STATUS_WORD[item.status]}</span>
                        <span> · {format(new Date(item.created_at), "d MMM yyyy")}</span>
                      </p>
                    </Link>

                    <div className="hidden shrink-0 items-center gap-2 md:flex">
                      {action}
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ id: item.id, title: item.title })}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete listing"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingDelete({ id: item.id, title: item.title })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:hidden"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {action && <div className="mt-3 md:hidden">{action}</div>}
                </article>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="my-claims" className="mt-5 space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : myClaims.length === 0 ? (
            <EmptyState
              title="No claims yet"
              text="When you claim something on the board, it appears here."
              action={
                <Button variant="outline" asChild>
                  <Link to="/items">Browse the board</Link>
                </Button>
              }
            />
          ) : (
            myClaims.map((claim) => (
              <article key={claim.id} className="tile p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[1.1rem] font-semibold tracking-tight">
                      <Link to={`/items/${claim.item_id}`} className="hover:underline">
                        {claim.items?.title || "Item"}
                      </Link>
                    </h2>
                    {claim.message && (
                      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{claim.message}</p>
                    )}
                  </div>
                  <p className={cn("shrink-0 text-[13px] font-medium", CLAIM_TONE[claim.status])}>
                    {CLAIM_WORD[claim.status]}
                  </p>
                </div>

                {claim.status === "pending" && (
                  <p className="mt-4 text-[13px] text-muted-foreground">Waiting for the poster to reply.</p>
                )}
                {claim.status === "approved" && (
                  <p className="mt-4 rounded-2xl bg-muted/80 px-4 py-3 text-[14px] leading-relaxed">
                    {claim.meeting_details || "Accepted. Meet in a public campus spot."}
                  </p>
                )}
                {claim.status === "rejected" && (
                  <p className="mt-4 text-[13px] text-muted-foreground">Declined. You can look for another listing.</p>
                )}
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-5 space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : incomingClaims.length === 0 ? (
            <EmptyState title="Inbox is empty" text="When someone claims one of your listings, you’ll see it here." />
          ) : (
            incomingClaims.map((claim) => (
              <article key={claim.id} className="tile p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[1.1rem] font-semibold tracking-tight">
                      <Link to={`/items/${claim.item_id}`} className="hover:underline">
                        {claim.items?.title}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      From {claim.profiles?.full_name || "an SFIT member"}
                    </p>
                  </div>
                  {claim.status !== "pending" && (
                    <p className={cn("shrink-0 text-[13px] font-medium", CLAIM_TONE[claim.status])}>
                      {CLAIM_WORD[claim.status]}
                    </p>
                  )}
                </div>

                <p className="mt-3 text-[15px] leading-relaxed">“{claim.message}”</p>

                {claim.status === "pending" && (
                  <form
                    className="mt-4 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const meetup = new FormData(event.currentTarget).get("meetup") as string;
                      resolveIncoming(claim.id, claim.item_id, "approved", meetup);
                    }}
                  >
                    <textarea
                      name="meetup"
                      placeholder="Optional meetup — Library entrance, 4 PM"
                      className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-ring/40"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="h-10" type="submit">
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10"
                        type="button"
                        onClick={() => resolveIncoming(claim.id, claim.item_id, "rejected")}
                      >
                        Decline
                      </Button>
                    </div>
                  </form>
                )}

                {claim.status === "approved" && claim.meeting_details && (
                  <p className="mt-4 text-[13px] text-muted-foreground">Meetup: {claim.meeting_details}</p>
                )}
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-5 space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : notifications.length === 0 ? (
            <EmptyState title="No alerts" text="You’ll get a note here when something happens on your listings." />
          ) : (
            notifications.map((notification) => {
              const itemHref = notification.related_item_id ? `/items/${notification.related_item_id}` : null;
              return (
                <article
                  key={notification.id}
                  className={cn("tile flex items-start gap-3 p-4", notification.read && "opacity-55")}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      notification.read ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    {itemHref ? (
                      <Link to={itemHref} className="block hover:underline">
                        <h2 className="font-medium tracking-tight">{notification.title}</h2>
                      </Link>
                    ) : (
                      <h2 className="font-medium tracking-tight">{notification.title}</h2>
                    )}
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      {format(new Date(notification.created_at), "d MMM, h:mm a")}
                    </p>
                  </div>
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => markNotifRead(notification.id)}
                      className="shrink-0 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Read
                    </button>
                  )}
                </article>
              );
            })
          )}
        </TabsContent>
      </Tabs>
      )}

      <div className="mt-8 sm:hidden">
        <Button asChild className="h-12 w-full">
          <Link to="/post">Post an item</Link>
        </Button>
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent className="menu-surface max-w-[22rem] rounded-[1.75rem] border-border/60 p-6 sm:rounded-[1.75rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl tracking-tight">Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title ? `“${pendingDelete.title}” will be removed from the board.` : "This listing will be removed from the board."} This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
            <AlertDialogCancel disabled={deleting} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) void deleteItem(pendingDelete.id);
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, index) => (
        <DashRowSkeleton key={index} />
      ))}
    </>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="tile px-6 py-14 text-center">
      <p className="font-display text-xl font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
