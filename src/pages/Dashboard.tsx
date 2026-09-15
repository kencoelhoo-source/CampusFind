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
import { Check, Package, Trash2, RotateCcw, Inbox, Bell } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { useSfitEmailLock } from "@/hooks/use-sfit-email-lock";
import { canManageSfitEmailLock } from "@/lib/email";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notifyEmail, notifyUser, requestDesktopNotifications } from "@/services/notifications";
import { hrefForNotification, presentNotification } from "@/lib/notification-routing";
import { cn } from "@/lib/utils";
import { DashRowSkeleton, DashboardSkeleton } from "@/components/common/Skeletons";
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
  withdrawn: "Withdrawn",
};

const DASH_TABS = ["my-items", "my-claims", "incoming", "notifications"] as const;
type DashTab = (typeof DASH_TABS)[number];

function tabFromSearch(value: string | null): DashTab {
  return DASH_TABS.includes(value as DashTab) ? (value as DashTab) : "my-items";
}

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [itemsRes, claimsRes, initialNotifsRes] = await Promise.all([
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
      .select("id, title, message, created_at, read, kind, related_item_id, related_claim_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (claimsRes.error) throw claimsRes.error;

  let notificationRows = (initialNotifsRes.data || []) as unknown as DBNotification[];
  if (initialNotifsRes.error) {
    if (!/kind/i.test(initialNotifsRes.error.message)) throw initialNotifsRes.error;
    const fallbackNotifs = await supabase
      .from("notifications")
      .select("id, title, message, created_at, read, related_item_id, related_claim_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (fallbackNotifs.error) throw fallbackNotifs.error;
    notificationRows = (fallbackNotifs.data || []) as unknown as DBNotification[];
  }

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
    notifications: notificationRows,
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
  const [pendingSfitLock, setPendingSfitLock] = useState(false);
  const [editingMeetupId, setEditingMeetupId] = useState<string | null>(null);
  const [desktopAlertsOn, setDesktopAlertsOn] = useState(
    () => typeof Notification !== "undefined" && Notification.permission === "granted",
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: Boolean(user),
    retry: 1,
    refetchInterval: 20000,
  });
  const { locked: sfitLock, setLocked: setSfitLock, isSaving: sfitLockSaving } = useSfitEmailLock();

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) return <Navigate to="/" replace />;

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

  const enableDesktopAlerts = async () => {
    const permission = await requestDesktopNotifications();
    if (permission === "granted") {
      setDesktopAlertsOn(true);
      toast.success("Desktop alerts on. You’ll see them when this tab is in the background.");
    } else if (permission === "denied") toast.error("Desktop alerts are blocked in this browser.");
    else toast.message("This browser doesn’t support desktop alerts.");
  };

  const clearAllAlerts = async () => {
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (error) {
      toast.error(`Could not clear alerts: ${error.message}`);
      return;
    }
    toast.success("Alerts cleared");
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
    if (status === "returned") {
      void notifyEmail({ kind: "item_returned", itemId: id });
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
    void notifyEmail({ kind: "item_deleted", itemId: id });
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
      }
    }

    const targetClaim = incomingClaims.find((c) => c.id === claimId);
    if (targetClaim?.user_id) {
      try {
        await notifyUser({
          userId: targetClaim.user_id,
          title: status === "approved" ? `Claim accepted: "${targetClaim.items?.title || "Item"}"` : `Claim declined: "${targetClaim.items?.title || "Item"}"`,
          message: status === "approved"
            ? `Your claim was accepted. ${meetup?.trim() ? meetup.trim() : "Hand it over in a public campus place (library, canteen, or security)."}`
            : `Your claim for "${targetClaim.items?.title || "Item"}" was declined.`,
          relatedItemId: itemId,
          relatedClaimId: claimId,
          kind: status === "approved" ? "claim_approved" : "claim_rejected",
        });
      } catch (notifErr) {
        console.warn("Could not dispatch notification to claimant:", notifErr);
      }
    }

    void notifyEmail({
      kind: status === "approved" ? "claim_approved" : "claim_rejected",
      claimId,
    });
    if (status === "approved") {
      void notifyEmail({ kind: "claim_superseded", itemId });
    }

    toast.success(status === "approved" ? "Accepted. Other pending claims were closed. Use a public campus place to hand it over." : "Claim declined.");
    await refreshQueries();
  };

  const withdrawClaim = async (claimId: string) => {
    const { error } = await supabase.from("claims").update({ status: "withdrawn" as never }).eq("id", claimId);
    if (error) {
      toast.error(`Could not withdraw: ${error.message}`);
      return;
    }
    void notifyEmail({ kind: "claim_withdrawn", claimId });
    toast.success("Claim withdrawn.");
    await refreshQueries();
  };

  const saveMeetup = async (claimId: string, meetup: string) => {
    const trimmed = meetup.trim();
    const { error } = await supabase
      .from("claims")
      .update({
        meeting_details: trimmed || null,
        meeting_requested: Boolean(trimmed),
      } as never)
      .eq("id", claimId);
    if (error) {
      toast.error(`Could not update pickup place: ${error.message}`);
      return;
    }
    void notifyEmail({ kind: "meetup_updated", claimId });
    toast.success("Pickup place saved.");
    await refreshQueries();
  };

  return (
    <div className="container py-8 md:py-14">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Account</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
        {canManageSfitEmailLock(user.email) && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-medium tracking-tight">SFIT emails only</p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {sfitLock
                  ? "Only @student.sfit.ac.in and @sfit.ac.in can sign in."
                  : "Any Google account can sign in (testing). Turning this on signs out non-SFIT users."}
              </p>
            </div>
            <Switch
              checked={sfitLock}
              disabled={sfitLockSaving}
              onCheckedChange={async (next) => {
                if (next) {
                  setPendingSfitLock(true);
                  return;
                }
                try {
                  await setSfitLock(false);
                  toast.success("Sign-in open to any Google account.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not update sign-in lock.");
                }
              }}
              aria-label="SFIT emails only"
            />
          </div>
        )}
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
          <TabsList className="grid w-full grid-cols-4 sm:inline-flex sm:w-auto sm:min-w-[440px]">
            <TabsTrigger value="my-items" className="px-2 text-[12px] sm:px-4 sm:text-[13px]">
              <span>Posted</span>
              {myItems.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10.5px] font-semibold tabular-nums text-foreground dark:bg-white/20 dark:text-white">
                  {myItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-claims" className="px-2 text-[12px] sm:px-4 sm:text-[13px]">
              <span>Claims</span>
              {myClaims.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10.5px] font-semibold tabular-nums text-foreground dark:bg-white/20 dark:text-white">
                  {myClaims.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="px-2 text-[12px] sm:px-4 sm:text-[13px]">
              <span>Inbox</span>
              {pendingInbox > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10.5px] font-semibold tabular-nums text-primary dark:bg-primary/30">
                  {pendingInbox}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="px-2 text-[12px] sm:px-4 sm:text-[13px]">
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="my-items" className="mt-5 space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : myItems.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6 text-amber-500 dark:text-amber-400" strokeWidth={1.75} />}
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
                    variant="secondary"
                    className="h-9 w-full md:w-auto border border-border/70"
                    onClick={() => setItemStatus(item.id, "returned", "Marked as resolved")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Resolved
                  </Button>
                ) : item.status === "found" || item.status === "claimed" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-full md:w-auto border border-border/70"
                    onClick={() => setItemStatus(item.id, "returned", "Marked as returned")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Returned
                  </Button>
                ) : item.status === "returned" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="secondary" className="h-9 w-full md:w-auto border border-border/70">
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
              icon={<Inbox className="h-6 w-6 text-indigo-500 dark:text-indigo-400" strokeWidth={1.75} />}
              title="No claims yet"
              text="When you claim something on the board, it appears here."
              action={
                <Button asChild>
                  <Link to="/items">Browse the board</Link>
                </Button>
              }
            />
          ) : (
            myClaims.map((claim) => (
              <article key={claim.id} className="tile p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 break-words font-display text-[1.1rem] font-semibold tracking-tight">
                    <Link to={`/items/${claim.item_id}`} className="hover:underline">
                      {claim.items?.title || "Item"}
                    </Link>
                  </h2>
                  <StatusChip status={claim.status} />
                </div>
                {claim.message && (
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{claim.message}</p>
                )}

                {claim.status === "pending" && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-[13px] text-muted-foreground">Waiting for the poster to reply.</p>
                    <Button size="sm" variant="secondary" className="h-8 border border-border/70" onClick={() => void withdrawClaim(claim.id)}>
                      Withdraw
                    </Button>
                  </div>
                )}
                {claim.status === "approved" && (
                  <MeetupBlock
                    claim={claim}
                    editing={editingMeetupId === claim.id}
                    onEdit={() => setEditingMeetupId(claim.id)}
                    onCancel={() => setEditingMeetupId(null)}
                    onSave={async (meetup) => {
                      await saveMeetup(claim.id, meetup);
                      setEditingMeetupId(null);
                    }}
                  />
                )}
                {claim.status === "rejected" && (
                  <p className="mt-4 text-[13px] text-muted-foreground">Declined. You can look for another listing.</p>
                )}
                {claim.status === "withdrawn" && (
                  <p className="mt-4 text-[13px] text-muted-foreground">You withdrew this claim.</p>
                )}
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-5 space-y-3">
          {isLoading ? (
            <SkeletonList />
          ) : incomingClaims.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6 text-sky-500 dark:text-sky-400" strokeWidth={1.75} />}
              title="Inbox is empty"
              text="When someone claims one of your listings, you’ll see it here."
            />
          ) : (
            incomingClaims.map((claim) => (
              <article key={claim.id} className="tile p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-[1.1rem] font-semibold tracking-tight">
                      <Link to={`/items/${claim.item_id}`} className="hover:underline">
                        {claim.items?.title}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      From {claim.profiles?.full_name || "an SFIT member"}
                    </p>
                  </div>
                  {claim.status !== "pending" && <StatusChip status={claim.status} />}
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
                      placeholder="Public pickup place — Library counter, daytime"
                      className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-ring/40"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="h-10" type="submit">
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-10 border border-border/70"
                        type="button"
                        onClick={() => resolveIncoming(claim.id, claim.item_id, "rejected")}
                      >
                        Decline
                      </Button>
                    </div>
                  </form>
                )}

                {claim.status === "approved" && (
                  <MeetupBlock
                    claim={claim}
                    editing={editingMeetupId === claim.id}
                    onEdit={() => setEditingMeetupId(claim.id)}
                    onCancel={() => setEditingMeetupId(null)}
                    onSave={async (meetup) => {
                      await saveMeetup(claim.id, meetup);
                      setEditingMeetupId(null);
                    }}
                  />
                )}
                {claim.status === "withdrawn" && (
                  <p className="mt-4 text-[13px] text-muted-foreground">This student withdrew the claim.</p>
                )}
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-5 space-y-3">
          {!desktopAlertsOn && (
            <div className="tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="font-medium tracking-tight">Turn on desktop alerts</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">Get a banner when this tab is in the background.</p>
              </div>
              <Button className="h-10 shrink-0 rounded-full px-5" onClick={() => void enableDesktopAlerts()}>
                Turn on
              </Button>
            </div>
          )}
          {isLoading ? (
            <SkeletonList />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-6 w-6 text-amber-500 dark:text-amber-300" strokeWidth={1.75} />}
              title="No alerts"
              text="You’ll get a note here when someone claims a listing, a claim is accepted or declined, or a possible match is posted."
            />
          ) : (
            <>
            {notifications.map((notification) => {
              const href = hrefForNotification(notification);
              const view = presentNotification(notification);
              return (
                <article
                  key={notification.id}
                  className="tile w-full min-w-0 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {view.kicker}
                    </p>
                    <span className="flex shrink-0 items-center gap-2">
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() => markNotifRead(notification.id)}
                          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Read
                        </button>
                      )}
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          notification.read ? "bg-transparent" : "bg-primary",
                        )}
                        aria-hidden
                      />
                    </span>
                  </div>
                  <Link
                    to={href}
                    className="mt-1.5 block w-full min-w-0"
                    onClick={() => {
                      if (!notification.read) void markNotifRead(notification.id);
                    }}
                  >
                    <h2 className="w-full min-w-0 font-display text-[1.05rem] font-semibold tracking-tight hover:underline [overflow-wrap:anywhere]">
                      {view.title}
                    </h2>
                  </Link>
                  <p className="mt-1 w-full text-[14px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    {view.body}
                  </p>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {format(new Date(notification.created_at), "d MMM, h:mm a")}
                  </p>
                </article>
              );
            })}
            <div className="flex justify-center pt-2 text-[13px] text-muted-foreground">
              <button type="button" className="hover:text-foreground" onClick={() => void clearAllAlerts()}>
                Clear all
              </button>
            </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      )}

      <AlertDialog open={pendingSfitLock} onOpenChange={(open) => !open && !sfitLockSaving && setPendingSfitLock(false)}>
        <AlertDialogContent className="menu-surface max-w-[22rem] rounded-[1.75rem] border-border/60 p-6 sm:rounded-[1.75rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl tracking-tight">Lock sign-in to SFIT emails?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone not on @student.sfit.ac.in or @sfit.ac.in will be signed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex flex-col gap-2.5 divide-y-0 sm:space-x-0">
            <AlertDialogCancel
              disabled={sfitLockSaving}
              className="h-11 rounded-full border border-white/15 border-t-white/15 bg-white/5 font-medium text-foreground hover:bg-white/10"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={sfitLockSaving}
              className="h-11 rounded-full border-0 !bg-white font-medium !text-neutral-900 hover:!bg-neutral-100"
              onClick={async (event) => {
                event.preventDefault();
                try {
                  await setSfitLock(true);
                  setPendingSfitLock(false);
                  toast.success("Sign-in locked to SFIT emails. Non-SFIT sessions will be signed out.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not update sign-in lock.");
                }
              }}
            >
              {sfitLockSaving ? "Locking…" : "Lock sign-in"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent className="menu-surface max-w-[22rem] rounded-[1.75rem] border-border/60 p-6 sm:rounded-[1.75rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl tracking-tight">Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title ? `“${pendingDelete.title}” will be removed from the board.` : "This listing will be removed from the board."} This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex flex-col gap-2.5 divide-y-0 sm:space-x-0">
            <AlertDialogCancel
              disabled={deleting}
              className="h-11 rounded-full border border-white/15 border-t-white/15 bg-white/5 font-medium text-foreground hover:bg-white/10"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="h-11 rounded-full border-0 bg-destructive font-medium text-destructive-foreground hover:bg-destructive/90"
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

function StatusChip({ status }: { status: DBClaim["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium",
        status === "pending" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        status === "approved" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "rejected" && "bg-muted text-muted-foreground",
        status === "withdrawn" && "bg-muted text-muted-foreground",
      )}
    >
      {CLAIM_WORD[status]}
    </span>
  );
}

function MeetupBlock({
  claim,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  claim: DBClaim;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (meetup: string) => void | Promise<void>;
}) {
  const note = claim.meeting_details?.trim();

  if (!editing) {
    return (
      <div className="mt-4 rounded-2xl bg-muted/50 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Pickup place</p>
        <p className="mt-1 text-[14px] leading-relaxed text-foreground">
          {note || "Use a public campus place — library, canteen, or security."}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {note ? "Change" : "Add a place"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const meetup = new FormData(event.currentTarget).get("meetup") as string;
        void onSave(meetup);
      }}
    >
      <textarea
        name="meetup"
        defaultValue={note || ""}
        placeholder="Library counter, daytime"
        className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-ring/40"
        rows={2}
      />
      <div className="flex gap-2">
        <Button size="sm" className="h-9" type="submit">
          Save place
        </Button>
        <Button size="sm" type="button" variant="secondary" className="h-9 border border-border/70" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="tile flex flex-col items-center px-6 py-14 text-center sm:py-16">
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      <p className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[14.5px] leading-relaxed text-muted-foreground sm:text-[15px]">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
