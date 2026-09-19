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
import { format, formatDistanceToNow } from "date-fns";
import { Check, Package, Trash2, RotateCcw, Inbox, Bell, MapPin, ArrowLeft, ArrowRight, ChevronLeft, ChevronDown, ShieldCheck } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { motion } from "framer-motion";
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

function itemStatusWord(item: DBItem): string {
  if (item.status === "returned") {
    return item.held_where ? "Returned" : "Resolved";
  }
  return STATUS_WORD[item.status] ?? item.status;
}

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

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      return formatDistanceToNow(d, { addSuffix: true });
    }
    return format(d, "MMM d, h:mm a");
  } catch {
    return "";
  }
}

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [itemsRes, claimsRes, initialNotifsRes] = await Promise.all([
    supabase
      .from("items")
      .select("id, title, status, created_at, user_id, location, category, held_where, held_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("claims")
      .select("id, item_id, user_id, message, status, meeting_details, meeting_requested, created_at, items(id, title, status, user_id, category, location)")
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
  const myClaims = (claimsRes.data as unknown as DBClaim[]) || [];
  const itemIds = myItems.map((item) => item.id);

  let incomingClaims: DBClaim[] = [];
  if (itemIds.length > 0) {
    const incomingRes = await supabase
      .from("claims")
      .select("id, item_id, user_id, message, status, meeting_details, meeting_requested, created_at")
      .in("item_id", itemIds)
      .order("created_at", { ascending: false });
    if (incomingRes.error) throw incomingRes.error;
    const itemById = new Map(myItems.map((item) => [item.id, item]));
    incomingClaims = ((incomingRes.data as unknown as DBClaim[]) || []).map((claim) => {
      const foundItem = itemById.get(claim.item_id);
      return {
        ...claim,
        items: foundItem
          ? {
              id: foundItem.id,
              title: foundItem.title,
              status: foundItem.status,
              user_id: userId,
              category: foundItem.category,
              location: foundItem.location,
              image_url: foundItem.image_url,
            }
          : { title: "Item", user_id: userId },
      };
    });
  }

  const allItemIds = Array.from(
    new Set([
      ...myItems.map((item) => item.id),
      ...myClaims.map((claim) => claim.item_id),
      ...incomingClaims.map((claim) => claim.item_id),
    ])
  ).filter(Boolean);

  if (allItemIds.length > 0) {
    const { data: images } = await supabase.from("item_images").select("item_id, url").in("item_id", allItemIds);
    const imageMap = new Map<string, string>();
    images?.forEach((image) => {
      if (!imageMap.has(image.item_id)) imageMap.set(image.item_id, image.url);
    });
    myItems.forEach((item) => {
      item.image_url = imageMap.get(item.id) || null;
    });
    myClaims.forEach((claim) => {
      if (claim.items) {
        claim.items.image_url = imageMap.get(claim.item_id) || null;
      }
    });
    incomingClaims.forEach((claim) => {
      if (claim.items && !claim.items.image_url) {
        claim.items.image_url = imageMap.get(claim.item_id) || null;
      }
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
    myClaims,
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
  const [dismissedDesktopAlertsPrompt, setDismissedDesktopAlertsPrompt] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<"all" | "pending" | "resolved">("all");
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const [claimsFilter, setClaimsFilter] = useState<"all" | "active" | "resolved">("all");
  const [dismissedClaimIds, setDismissedClaimIds] = useState<string[]>(() => {
    if (!user?.id) return [];
    try {
      const stored = localStorage.getItem(`campusfind_dismissed_claims_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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

  const visibleClaims = myClaims.filter((c) => !dismissedClaimIds.includes(c.id));

  const activeClaimsCount = visibleClaims.filter(
    (c) => c.status === "pending" || (c.status === "approved" && c.items?.status !== "returned")
  ).length;

  const resolvedClaimsCount = visibleClaims.filter(
    (c) => c.status === "withdrawn" || c.status === "rejected" || c.items?.status === "returned"
  ).length;

  const filteredMyClaims = visibleClaims.filter((claim) => {
    const isResolved =
      claim.status === "withdrawn" ||
      claim.status === "rejected" ||
      claim.items?.status === "returned";
    if (claimsFilter === "active") return !isResolved;
    if (claimsFilter === "resolved") return isResolved;
    return true;
  });

  const filteredIncoming = incomingClaims.filter((claim) => {
    if (inboxFilter === "pending") return claim.status === "pending";
    if (inboxFilter === "resolved") return claim.status !== "pending";
    return true;
  });

  const activeSelectedClaim =
    filteredIncoming.find((c) => c.id === selectedClaimId) || null;

  const filteredNotifications = notifications.filter((notification) => {
    if (notifFilter === "unread") return !notification.read;
    return true;
  });

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

  const markAllNotifsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (error) {
      toast.error(`Could not update alerts: ${error.message}`);
      return;
    }
    toast.success("All alerts marked as read");
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
    const payload: Record<string, unknown> = { status };
    if (status === "lost") {
      payload.held_where = null;
      payload.held_at = null;
    }
    const { error } = await supabase.from("items").update(payload as never).eq("id", id);
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

  const clearClaim = async (claimId: string) => {
    const nextDismissed = Array.from(new Set([...dismissedClaimIds, claimId]));
    setDismissedClaimIds(nextDismissed);
    if (user) {
      try {
        localStorage.setItem(`campusfind_dismissed_claims_${user.id}`, JSON.stringify(nextDismissed));
      } catch {
        // ignore storage errors
      }
      void supabase.from("claims").delete().eq("id", claimId);
    }
    toast.success("Claim removed from your history", {
      action: {
        label: "Undo",
        onClick: () => {
          const undone = dismissedClaimIds.filter((id) => id !== claimId);
          setDismissedClaimIds(undone);
          if (user) {
            try {
              localStorage.setItem(`campusfind_dismissed_claims_${user.id}`, JSON.stringify(undone));
            } catch {
              // ignore
            }
          }
        },
      },
    });
  };

  const clearAllResolvedClaims = async () => {
    const resolvedIds = visibleClaims
      .filter((c) => c.status === "withdrawn" || c.status === "rejected" || c.items?.status === "returned")
      .map((c) => c.id);

    if (resolvedIds.length === 0) return;

    const nextDismissed = Array.from(new Set([...dismissedClaimIds, ...resolvedIds]));
    setDismissedClaimIds(nextDismissed);
    if (user) {
      try {
        localStorage.setItem(`campusfind_dismissed_claims_${user.id}`, JSON.stringify(nextDismissed));
      } catch {
        // ignore
      }
      void supabase.from("claims").delete().in("id", resolvedIds);
    }
    toast.success("Resolved claims cleared", {
      action: {
        label: "Undo",
        onClick: () => {
          setDismissedClaimIds(dismissedClaimIds);
          if (user) {
            try {
              localStorage.setItem(`campusfind_dismissed_claims_${user.id}`, JSON.stringify(dismissedClaimIds));
            } catch {
              // ignore
            }
          }
        },
      },
    });
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
        className="mt-6 sm:mt-7"
      >
        <div className="sticky top-14 z-30 py-2 sm:py-2.5">
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
              {visibleClaims.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10.5px] font-semibold tabular-nums text-foreground dark:bg-white/20 dark:text-white">
                  {visibleClaims.length}
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
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[10.5px] font-semibold tabular-nums text-destructive dark:bg-destructive/25 dark:text-red-400">
                  {unreadCount}
                </span>
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
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-full md:w-auto border border-border/70"
                    onClick={() =>
                      item.held_where
                        ? setItemStatus(item.id, "found", "Reopened as found")
                        : setItemStatus(item.id, "lost", "Reopened as lost")
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {item.held_where ? "Reopen as found" : "Reopen as lost"}
                  </Button>
                ) : null;

              return (
                <article key={item.id} className="tile px-3 py-3 sm:px-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Link
                      to={`/items/${item.id}`}
                      className="relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={`Thumbnail of ${item.title}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-end bg-gradient-to-br from-muted to-secondary p-2">
                          <Package className="h-4 w-4 text-muted-foreground/70" />
                        </div>
                      )}
                    </Link>

                    <Link to={`/items/${item.id}`} className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-[1.15rem] font-semibold tracking-tight">{item.title}</h2>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        <span className={STATUS_TONE[item.status]}>{itemStatusWord(item)}</span>
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

        <TabsContent value="my-claims" className="mt-5">
          {visibleClaims.length > 0 && (
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-0.5">
              <div className="flex flex-row items-center justify-between w-full sm:w-auto sm:justify-start gap-3 sm:gap-5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] font-medium text-foreground">Your claims</span>
                </div>

                {/* Segmented Filter Control */}
                <div className="relative inline-flex w-fit items-center rounded-full border border-black/[0.04] bg-neutral-100/50 p-[3px] dark:border-white/[0.06] dark:bg-white/[0.03]">
                  {["all", "active", "resolved"].map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setClaimsFilter(filter as "all" | "active" | "resolved")}
                      className={cn(
                        "relative z-10 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors outline-none",
                        claimsFilter === filter
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {claimsFilter === filter && (
                        <motion.div
                          layoutId="claimsFilterPill"
                          className="absolute inset-0 z-[-1] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:bg-[#202024] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <span className="capitalize">{filter}</span>{" "}
                      ({filter === "all" ? visibleClaims.length : filter === "active" ? activeClaimsCount : resolvedClaimsCount})
                    </button>
                  ))}
                </div>
              </div>

              {resolvedClaimsCount > 0 && (
                <button
                  type="button"
                  onClick={() => void clearAllResolvedClaims()}
                  className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-rose-500 dark:hover:text-rose-400"
                >
                  Clear resolved
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <SkeletonList />
            </div>
          ) : visibleClaims.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6 text-indigo-500 dark:text-indigo-400" strokeWidth={1.75} />}
              title="No claims yet"
              text={
                myClaims.length > 0
                  ? "All completed claims have been cleared from your history."
                  : "When you claim something on the board, it appears here."
              }
              action={
                <Button asChild>
                  <Link to="/items">Browse the board</Link>
                </Button>
              }
            />
          ) : filteredMyClaims.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-card/60 p-8 text-center my-4">
              <p className="text-[13px] text-muted-foreground">
                {claimsFilter === "active"
                  ? "No active claims in progress."
                  : "No resolved claims in history."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {filteredMyClaims.map((claim) => (
                <MyClaimCard
                  key={claim.id}
                  claim={claim}
                  editing={editingMeetupId === claim.id}
                  onEdit={() => setEditingMeetupId(claim.id)}
                  onCancel={() => setEditingMeetupId(null)}
                  onSaveMeetup={async (meetup) => {
                    await saveMeetup(claim.id, meetup);
                    setEditingMeetupId(null);
                  }}
                  onWithdraw={(id) => void withdrawClaim(id)}
                  onClear={(id) => void clearClaim(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-3 sm:mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <SkeletonList />
            </div>
          ) : incomingClaims.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-7 w-7 text-sky-500/80 dark:text-sky-400/80" strokeWidth={1.5} />}
              title="Inbox is clear"
              text="When someone claims one of your listings or sends a verification note, it will arrive here."
            />
          ) : (
            <div
              id="inbox-console-container"
              className="rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-card overflow-hidden flex flex-col lg:flex-row scroll-mt-20 h-auto lg:h-[620px]"
            >
              {/* Left Panel: Triage Queue List */}
              <div
                className={cn(
                  "w-full lg:w-[340px] shrink-0 border-black/[0.08] dark:border-white/[0.08] flex flex-col bg-[#fbfbfd] dark:bg-[#161618]",
                  mobileDetailOpen ? "hidden lg:flex" : "flex",
                  "lg:border-r lg:h-full"
                )}
              >
                {/* Queue Header & Segmented Filter */}
                <div className="h-14 px-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold tracking-tight text-foreground">Claims</span>
                    <span className="text-[11px] text-muted-foreground font-medium">({incomingClaims.length})</span>
                  </div>

                  {/* Smooth Animated Segmented Control */}
                  <div className="relative flex items-center p-[3px] rounded-full bg-black/[0.04] dark:bg-white/[0.04] w-[176px] h-[28px] select-none">
                    {/* Absolute track container perfectly bounded by the padding */}
                    <div className="absolute inset-[3px] pointer-events-none flex">
                      <div
                        className="h-full w-1/3 bg-white dark:bg-[#2c2c30] rounded-full shadow-[0_1px_2.5px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.06)] transition-transform duration-[350ms] ease-[cubic-bezier(0.2,0.9,0.4,1)]"
                        style={{
                          transform: `translateX(${
                            inboxFilter === "all" ? "0%" : inboxFilter === "pending" ? "100%" : "200%"
                          })`,
                        }}
                      />
                    </div>
                    
                    {(["all", "pending", "resolved"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setInboxFilter(f)}
                        className={cn(
                          "relative z-10 flex-1 flex items-center justify-center h-full text-[11px] font-medium transition-colors duration-[350ms] capitalize rounded-full select-none",
                          inboxFilter === f
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {f === "all" ? "All" : f === "pending" ? "Review" : "Done"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable Queue Feed */}
                {filteredIncoming.length === 0 ? (
                  <div className="p-8 text-center my-auto">
                    <p className="text-[12px] text-muted-foreground">
                      {inboxFilter === "pending"
                        ? "No incoming claims awaiting review."
                        : "No resolved claims in history."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1">
                    {filteredIncoming.map((claim) => {
                      const isSelected = activeSelectedClaim?.id === claim.id;
                      return (
                        <button
                          key={claim.id}
                          type="button"
                          onClick={() => {
                            setSelectedClaimId(claim.id);
                            setMobileDetailOpen(true);
                            if (typeof window !== "undefined" && window.innerWidth < 1024) {
                              document.getElementById("inbox-console-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                          className={cn(
                            "w-full text-left p-4 transition-colors duration-150 relative block group border-b border-black/[0.06] dark:border-white/[0.06]",
                            isSelected
                              ? "bg-black/[0.03] dark:bg-white/[0.04]"
                              : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-2 min-w-0 mb-1">
                            <span className="font-semibold text-[14px] text-foreground truncate min-w-0 pr-2 block">
                              {claim.profiles?.full_name || "SFIT Member"}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0 font-normal">
                              {claim.created_at ? formatRelativeTime(claim.created_at) : ""}
                            </span>
                          </div>
                          <p className="text-[13px] font-medium text-foreground/80 truncate pr-2 mb-1">
                            {claim.items?.title || "Item"}
                          </p>
                          <p className="text-[12px] text-muted-foreground line-clamp-1 pr-2 mb-3">
                            {claim.message || "No verification note provided"}
                          </p>
                          <div className="flex items-center justify-between text-[11.5px]">
                            <span
                              className={cn(
                                "font-medium",
                                claim.status === "pending" && "text-foreground font-medium",
                                claim.status === "approved" && "text-foreground font-medium",
                                (claim.status === "rejected" || claim.status === "withdrawn") && "text-muted-foreground"
                              )}
                            >
                              {claim.status === "pending" ? "Needs review" : claim.status === "approved" ? "Handover active" : "Resolved"}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80 truncate max-w-[130px]">
                              {claim.items?.location || "SFIT"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Panel: Focused Inspector & Handover Canvas */}
              <div
                className={cn(
                  "flex-1 min-w-0 flex flex-col bg-white dark:bg-[#1c1c1e]",
                  mobileDetailOpen ? "flex" : "hidden lg:flex",
                  "lg:h-full"
                )}
              >
                {activeSelectedClaim ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <ClaimInspectionCanvas
                      claim={activeSelectedClaim}
                      editing={editingMeetupId === activeSelectedClaim.id}
                      onEdit={() => setEditingMeetupId(activeSelectedClaim.id)}
                      onCancel={() => setEditingMeetupId(null)}
                      onSaveMeetup={async (meetup) => {
                        await saveMeetup(activeSelectedClaim.id, meetup);
                        setEditingMeetupId(null);
                      }}
                      onResolve={resolveIncoming}
                      onBack={() => {
                        setMobileDetailOpen(false);
                        setSelectedClaimId(null);
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                          document.getElementById("inbox-console-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center p-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-muted-foreground/70 mb-3">
                      <Inbox className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <p className="text-[14px] font-semibold text-foreground">Select a claim to review</p>
                    <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
                      Choose any pending or resolved claim from the queue to inspect details and coordinate handover.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          {notifications.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">Alerts & activity</span>
                {unreadCount > 0 && (
                  <span className="rounded-md bg-campus/10 px-1.5 py-0.5 text-[11px] font-semibold text-campus dark:bg-campus/20">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                {unreadCount > 0 && unreadCount < notifications.length && (
                  <div className="inline-flex items-center rounded-xl border border-border/50 bg-secondary/30 p-0.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => setNotifFilter("all")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all",
                        notifFilter === "all"
                          ? "bg-background text-foreground shadow-sm dark:bg-[#1e1e24] dark:text-white"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter("unread")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all",
                        notifFilter === "unread"
                          ? "bg-background text-foreground shadow-sm dark:bg-[#1e1e24] dark:text-white"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>
                )}

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllNotifsRead()}
                    className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void clearAllAlerts()}
                  className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {!desktopAlertsOn && !dismissedDesktopAlertsPrompt && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-white/[0.08] dark:bg-[#151518]/90">
              <div className="flex items-start gap-3 min-w-0">
                <Bell className="h-4 w-4 text-campus shrink-0 mt-0.5" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium tracking-tight text-foreground">Enable desktop alerts</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Get instant browser notifications when your listings are claimed or pickup details are shared.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDismissedDesktopAlertsPrompt(true)}
                  className="h-8 rounded-lg px-2.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dismiss
                </button>
                <Button
                  size="sm"
                  className="h-8 rounded-lg px-3.5 text-[12px] font-medium"
                  onClick={() => void enableDesktopAlerts()}
                >
                  Turn on
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <SkeletonList />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-7 w-7 text-muted-foreground/60" strokeWidth={1.5} />}
              title="No alerts"
              text="You’ll get notes here when someone claims a listing, a pickup is arranged, or a match is posted."
            />
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card/40 py-12 text-center dark:border-white/[0.06] dark:bg-white/[0.015]">
              <p className="text-[13.5px] text-muted-foreground">
                All caught up. No unread notifications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => void markNotifRead(id)}
                />
              ))}
            </div>
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

function ClaimStatusIndicator({
  status,
  isIncoming = false,
}: {
  status: DBClaim["status"];
  isIncoming?: boolean;
}) {
  const textColor = {
    pending: "text-foreground",
    approved: "text-foreground",
    rejected: "text-muted-foreground",
    withdrawn: "text-muted-foreground",
  }[status];

  const label = isIncoming && status === "pending" ? "Needs review" : CLAIM_WORD[status];

  return (
    <span className={cn("text-[12.5px] font-medium tracking-tight shrink-0 select-none", textColor)}>
      {label}
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
      <div className="mt-4 border-t border-black/[0.05] dark:border-white/[0.05] pt-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-[12.5px] font-medium">
              Handover location
            </span>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-[12px] font-medium text-foreground hover:underline"
          >
            {note ? "Change" : "Specify location"}
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground">
          {note || "Use a public campus place — library, canteen, or security."}
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-4 border-t border-black/[0.05] dark:border-white/[0.05] pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const meetup = new FormData(event.currentTarget).get("meetup") as string;
        void onSave(meetup);
      }}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <span className="text-[12.5px] font-medium">
          Set handover location
        </span>
      </div>
      <input
        type="text"
        name="meetup"
        defaultValue={note || ""}
        placeholder="e.g. Library front desk, lunchtime"
        className="w-full rounded-md border border-black/[0.1] dark:border-white/[0.1] bg-transparent px-3 py-2 text-[13px] outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground"
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          size="sm"
          type="button"
          variant="ghost"
          className="h-8 rounded-md text-[12px] hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button size="sm" className="h-8 rounded-md text-[12px] px-3.5 bg-foreground text-background shadow-sm hover:bg-foreground/90" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}

function MyClaimCard({
  claim,
  editing,
  onEdit,
  onCancel,
  onSaveMeetup,
  onWithdraw,
  onClear,
}: {
  claim: DBClaim;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaveMeetup: (meetup: string) => Promise<void> | void;
  onWithdraw: (id: string) => void;
  onClear?: (id: string) => void;
}) {
  const formattedDate = claim.created_at
    ? (() => {
        try {
          return format(new Date(claim.created_at), "MMM d, yyyy");
        } catch {
          return null;
        }
      })()
    : null;

  const itemNavigationState = {
    fromClaim: claim,
    itemTitle: claim.items?.title,
    itemStatus: claim.items?.status,
    itemCategory: claim.items?.category,
    itemLocation: claim.items?.location,
  };

  const isResolved =
    claim.status === "withdrawn" ||
    claim.status === "rejected" ||
    claim.items?.status === "returned";

  return (
    <article className="flex flex-col justify-between rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-card p-5 transition-all">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              to={`/items/${claim.item_id}`}
              state={itemNavigationState}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-black/[0.05] dark:border-white/[0.05] bg-muted/60 transition-opacity hover:opacity-80"
            >
              {claim.items?.image_url ? (
                <img src={claim.items.image_url} alt={`Thumbnail of ${claim.items.title}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/40">
                  <Package className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                </div>
              )}
            </Link>

            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-medium tracking-tight">
                <Link
                  to={`/items/${claim.item_id}`}
                  state={itemNavigationState}
                  className="hover:underline transition-colors"
                >
                  {claim.items?.title || "Item"}
                </Link>
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground truncate">
                {formattedDate ? `Claimed ${formattedDate}` : "Active claim"}
                {claim.items?.location && ` · ${claim.items.location}`}
              </p>
            </div>
          </div>

          <ClaimStatusIndicator status={claim.status} />
        </div>

        {/* Verification Proof Memo Box */}
        {claim.message && (
          <div className="mb-4">
            <p className="text-[12.5px] font-medium text-muted-foreground mb-1.5">
              Proof note
            </p>
            <div className="border-l-2 border-black/[0.08] dark:border-white/[0.08] pl-3 py-1">
              <p className="text-[13px] leading-relaxed text-foreground">
                {claim.message}
              </p>
            </div>
          </div>
        )}

        {/* Handover Location Block if Approved */}
        {claim.status === "approved" && (
          <MeetupBlock
            claim={claim}
            editing={editing}
            onEdit={onEdit}
            onCancel={onCancel}
            onSave={onSaveMeetup}
          />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-black/[0.05] dark:border-white/[0.05] pt-4 gap-2">
        <div className="text-[12.5px] text-muted-foreground truncate">
          {claim.status === "pending" && "Awaiting response from poster"}
          {claim.status === "approved" && (
            <span className="text-foreground font-medium">
              Ready for campus collection
            </span>
          )}
          {claim.status === "rejected" && "Claim was declined"}
          {claim.status === "withdrawn" && "You withdrew this claim"}
        </div>

        <div className="flex items-center gap-2">
          {claim.status === "pending" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-md text-[12.5px] text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors px-3"
              onClick={() => onWithdraw(claim.id)}
            >
              Withdraw
            </Button>
          )}
          {claim.status === "approved" && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 rounded-md border-black/[0.1] dark:border-white/[0.1] text-[12.5px] px-3 shadow-sm"
            >
              <Link to={`/items/${claim.item_id}`} state={itemNavigationState}>View listing</Link>
            </Button>
          )}
          {isResolved && onClear && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-md text-[12.5px] text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors px-2.5 flex items-center gap-1.5"
              onClick={() => onClear(claim.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function getInitials(name: string): string {
  if (!name) return "SF";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ClaimInspectionCanvas({
  claim,
  editing,
  onEdit,
  onCancel,
  onSaveMeetup,
  onResolve,
  onBack,
}: {
  claim: DBClaim;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaveMeetup: (meetup: string) => Promise<void> | void;
  onResolve: (claimId: string, itemId: string, status: "approved" | "rejected", meetup?: string) => void;
  onBack?: () => void;
}) {
  const [meetupInput, setMeetupInput] = useState("");
  const formattedRelative = claim.created_at ? formatRelativeTime(claim.created_at) : null;
  const claimantName = claim.profiles?.full_name || "SFIT Member";

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#161618]">
      {/* 56px Top Header Bar: Continuous horizontal baseline */}
      <div className="h-14 px-4 sm:px-6 border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between gap-3 shrink-0 bg-white/80 dark:bg-[#161618]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground active:opacity-60 transition-opacity -ml-1 py-1 border-0 bg-transparent p-0 shadow-none"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Claims</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span>Verification review</span>
          </div>
        </div>

        {/* Pure Typographic Status Chip */}
        <div className="shrink-0 text-right">
          <span className={cn(
            "text-[12.5px] font-medium",
            claim.status === "pending" && "text-foreground",
            claim.status === "approved" && "text-foreground",
            (claim.status === "rejected" || claim.status === "withdrawn") && "text-muted-foreground"
          )}>
            Status: {claim.status === "pending" ? "Pending" : claim.status === "approved" ? "Handover active" : claim.status === "rejected" ? "Declined" : "Withdrawn"}
          </span>
        </div>
      </div>

      {/* Main Inspection Canvas Body: Continuous Flow */}
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6 flex flex-col gap-5">
        
        {/* SECTION A: Claimant Profile & Target Listing */}
        <div>
          <div className="flex flex-col mb-5">
            <h3 className="font-medium text-[15px] text-foreground tracking-tight">
              {claimantName}
            </h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              SFIT Student {formattedRelative ? `· Filed ${formattedRelative}` : ""}
            </p>
          </div>

          <div className="flex flex-col rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <span className="text-[13px] text-muted-foreground w-16 shrink-0">Item</span>
              <span className="text-[13px] font-medium text-foreground truncate">{claim.items?.title || "Item"}</span>
              <Link
                to={`/items/${claim.item_id}`}
                state={{ fromClaim: claim, itemTitle: claim.items?.title, itemStatus: claim.items?.status }}
                className="text-[12px] text-muted-foreground hover:text-foreground hover:underline ml-auto shrink-0 transition-colors inline-flex items-center gap-0.5"
              >
                View <span className="text-[10px]">↗</span>
              </Link>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-[13px] text-muted-foreground w-16 shrink-0">Location</span>
              <span className="text-[13px] font-medium text-foreground truncate">{claim.items?.location || "SFIT Campus"}</span>
            </div>
          </div>
        </div>

        {/* SECTION B: Verification Statement */}
        <div>
          <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] px-4 py-3">
            <p className="text-[12px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Note from claimant
            </p>
            <p className="text-[13.5px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
              {claim.message || <span className="italic text-muted-foreground">No verification details provided.</span>}
            </p>
          </div>
        </div>

        {/* SECTION C: Decision Console */}
        <div className="mt-auto pt-2">
          {claim.status === "pending" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onResolve(claim.id, claim.item_id, "approved", meetupInput.trim());
              }}
              className="w-full"
            >
              <div className="grid grid-cols-2 sm:grid-cols-[120px_120px_auto] items-center gap-2.5">
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  className="rounded-full h-9 px-4 text-[13px] font-medium bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground w-full order-2 sm:order-1"
                  onClick={() => onResolve(claim.id, claim.item_id, "rejected")}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="rounded-full h-9 px-5 text-[13px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm w-full order-3 sm:order-2"
                  type="submit"
                >
                  Accept claim
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="group rounded-full h-9 px-4 text-[12px] font-medium border-black/[0.12] dark:border-white/[0.12] gap-1.5 shadow-sm text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] col-span-2 sm:col-span-1 w-full transition-all order-1 sm:order-3">
                      <MapPin className="h-3.5 w-3.5 opacity-70 shrink-0" />
                      <span className="truncate max-w-[140px]">{meetupInput || "Set location"}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-auto sm:ml-0.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px] rounded-xl menu-surface">
                    <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("SFIT Library")}>SFIT Library</DropdownMenuItem>
                    <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("Canteen")}>Canteen</DropdownMenuItem>
                    <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("Security Desk")}>Security Desk</DropdownMenuItem>
                    <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("Main Gate")}>Main Gate</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </form>
          )}

          {claim.status === "approved" && (
            <div className="max-w-sm">
              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onSaveMeetup(meetupInput);
                  }}
                  className="w-full"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-[120px_120px_auto] items-center gap-2.5">
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      className="rounded-full h-8 px-4 text-[12px] font-medium bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground w-full order-2 sm:order-1"
                      onClick={onCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full h-8 px-5 text-[12px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm w-full order-3 sm:order-2"
                      type="submit"
                    >
                      Save
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="group rounded-full h-8 px-4 text-[12px] font-medium border-black/[0.12] dark:border-white/[0.12] gap-1.5 shadow-sm text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02] col-span-2 sm:col-span-1 w-full transition-all order-1 sm:order-3">
                          <MapPin className="h-3.5 w-3.5 opacity-70 shrink-0" />
                          <span className="truncate max-w-[140px]">{meetupInput || claim.meeting_details || "Set location"}</span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-auto sm:ml-0.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px] rounded-xl menu-surface">
                        <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("SFIT Library")}>SFIT Library</DropdownMenuItem>
                        <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("Canteen")}>Canteen</DropdownMenuItem>
                        <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("Security Desk")}>Security Desk</DropdownMenuItem>
                        <DropdownMenuItem className="text-[12px]" onClick={() => setMeetupInput("Main Gate")}>Main Gate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-muted-foreground mb-1">Handover location</span>
                    <span className="text-[13.5px] text-foreground">
                      {claim.meeting_details?.trim() || "Public campus place"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onEdit}
                    className="rounded-md h-8 px-3 text-[12px] font-medium border-black/[0.1] dark:border-white/[0.1] shadow-sm self-start sm:self-auto"
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>
          )}

          {(claim.status === "rejected" || claim.status === "withdrawn") && (
            <div className="text-[13px] text-muted-foreground">
              {claim.status === "rejected" && "You declined this claim."}
              {claim.status === "withdrawn" && "The claimant withdrew this request."}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: DBNotification;
  onMarkRead: (id: string) => void;
}) {
  const href = hrefForNotification(notification);
  const view = presentNotification(notification);
  const formattedRelative = formatRelativeTime(notification.created_at);

  return (
    <article
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all",
        notification.read
          ? "border-border/50 bg-card/60 dark:border-white/[0.06] dark:bg-[#151518]/70 hover:border-border/80 dark:hover:border-white/[0.12]"
          : "border-border/80 bg-card/90 dark:border-white/[0.12] dark:bg-[#18181c]/95 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:border-primary/40 dark:hover:border-primary/40",
      )}
    >
      <div>
        {/* Top Header: Kicker + Unread tag + Read toggle */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            {view.kicker}
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            {!notification.read && (
              <>
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-campus">
                  New
                </span>
                <button
                  type="button"
                  onClick={() => onMarkRead(notification.id)}
                  className="text-[11.5px] font-medium text-muted-foreground/80 transition-colors hover:text-foreground"
                >
                  Mark read
                </button>
              </>
            )}
          </div>
        </div>

        {/* Title link */}
        <Link
          to={href}
          className="mt-2 block group/link"
          onClick={() => {
            if (!notification.read) onMarkRead(notification.id);
          }}
        >
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover/link:text-campus line-clamp-1">
            {view.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground/80 dark:text-foreground/75 font-normal line-clamp-2">
            {view.body}
          </p>
        </Link>
      </div>

      {/* Hairline Footer: Relative timestamp on left, direct action on right */}
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2.5 dark:border-white/[0.05] text-[11.5px] text-muted-foreground">
        <span>{formattedRelative}</span>
        <Link
          to={href}
          className="font-medium text-foreground/90 transition-colors hover:text-campus hover:underline inline-flex items-center gap-1"
          onClick={() => {
            if (!notification.read) onMarkRead(notification.id);
          }}
        >
          Open details →
        </Link>
      </div>
    </article>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/40 px-6 py-14 text-center sm:py-16 dark:border-white/[0.06] dark:bg-white/[0.015]">
      {icon && (
        <div className="mb-4 flex items-center justify-center text-muted-foreground/60">
          {icon}
        </div>
      )}
      <p className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground sm:text-[14px]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
