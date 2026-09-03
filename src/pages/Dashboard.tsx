import { Link, useSearchParams, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/constants";
import { format } from "date-fns";
import { Bell, Package, Search, CheckCircle, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notifyUser } from "@/services/notifications";
import type { DBItem, DBClaim, DBNotification, DashboardData } from "@/types/database";

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [itemsRes, claimsRes, notifsRes, incomingRes] = await Promise.all([
    supabase.from("items").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("claims").select("*, items(title, status, user_id)").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("claims").select("*, items!inner(title, user_id)").eq("items.user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (claimsRes.error) throw claimsRes.error;
  if (notifsRes.error) throw notifsRes.error;
  if (incomingRes.error) throw incomingRes.error;

  const incomingClaims = ((incomingRes.data as unknown as DBClaim[]) || []).map((claim) => ({ ...claim }));

  if (incomingClaims.length > 0) {
    const userIds = Array.from(new Set(incomingClaims.map((claim) => claim.user_id)));
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    incomingClaims.forEach((claim) => {
      const profile = profiles?.find((item) => item.user_id === claim.user_id);
      if (profile) {
        claim.profiles = { full_name: profile.full_name };
      }
    });
  }

  return {
    myItems: (itemsRes.data as unknown as DBItem[]) || [],
    myClaims: (claimsRes.data as unknown as DBClaim[]) || [],
    notifications: (notifsRes.data as unknown as DBNotification[]) || [],
    incomingClaims,
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "my-items";

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: Boolean(user),
  });

  if (!user) return <Navigate to="/" replace />;

  const myItems = data?.myItems || [];
  const myClaims = data?.myClaims || [];
  const notifications = data?.notifications || [];
  const incomingClaims = data?.incomingClaims || [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["home"] }),
      queryClient.invalidateQueries({ queryKey: ["browse-items"] }),
      queryClient.invalidateQueries({ queryKey: ["item"] }),
    ]);
  };

  const markNotifRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);

    if (error) {
      toast.error(`Failed to update notification: ${error.message}`);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
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
    const { data: images, error: imagesError } = await supabase.from("item_images").select("storage_path").eq("item_id", id);
    if (imagesError) {
      toast.error(`Failed to load item images: ${imagesError.message}`);
      return;
    }

    if (images && images.length > 0) {
      const { error: storageError } = await supabase.storage.from("item-images").remove(images.map((image) => image.storage_path));

      if (storageError) {
        toast.error(`Failed to delete item images: ${storageError.message}`);
        return;
      }
    }

    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      toast.error(`Failed to delete item: ${error.message}`);
      return;
    }

    toast.success("Item deleted");
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

    // Notify the claimant of the decision
    const targetClaim = incomingClaims.find((c) => c.id === claimId);
    if (targetClaim?.user_id) {
      try {
        await notifyUser({
          userId: targetClaim.user_id,
          title: status === "approved" ? `Claim Accepted: "${targetClaim.items?.title || "Item"}"` : `Claim Declined: "${targetClaim.items?.title || "Item"}"`,
          message: status === "approved"
            ? `Your claim was accepted! Meetup info: ${meetup?.trim() || "Check your claims tab on CampusFind."}`
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
    <div className="container py-12 md:py-16">
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Account</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Listings, incoming claims, and alerts. Accept or decline — then meet on campus.</p>

      <Tabs defaultValue={defaultTab} className="mt-8">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="my-items"><Package className="mr-1 hidden h-4 w-4 sm:block" /> My items</TabsTrigger>
          <TabsTrigger value="my-claims"><Search className="mr-1 hidden h-4 w-4 sm:block" /> My claims</TabsTrigger>
          <TabsTrigger value="incoming"><CheckCircle className="mr-1 hidden h-4 w-4 sm:block" /> Incoming</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            <Bell className="mr-1 hidden h-4 w-4 sm:block" /> Alerts
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-items" className="mt-4 space-y-3">
          {isLoading ? <SkeletonList /> : myItems.length === 0 ? (
            <EmptyState text="You haven't posted any items yet." action={<Button asChild><Link to="/post">Post an item</Link></Button>} />
          ) : myItems.map((item) => {
            const itemStyle = STATUS_COLORS[item.status];

            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link to={`/items/${item.id}`} className="font-semibold text-foreground hover:underline">{item.title}</Link>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={`${itemStyle.bg} ${itemStyle.text} border-0 text-xs`}>{itemStyle.label}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === "lost" && (
                      <Button size="sm" variant="outline" onClick={() => setItemStatus(item.id, "returned", "Item marked as resolved")}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5 text-success" /> Mark Resolved
                      </Button>
                    )}
                    {(item.status === "found" || item.status === "claimed") && (
                      <Button size="sm" variant="outline" onClick={() => setItemStatus(item.id, "returned", "Item marked as returned")}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5 text-success" /> Mark Returned
                      </Button>
                    )}
                    {item.status === "returned" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setItemStatus(item.id, "lost", "Item reopened as Lost")}>
                            Reopen as Lost
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setItemStatus(item.id, "found", "Item reopened as Found")}>
                            Reopen as Found
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="my-claims" className="mt-4 space-y-3">
          {isLoading ? <SkeletonList /> : myClaims.length === 0 ? (
            <EmptyState text="You haven't claimed any items yet." />
          ) : myClaims.map((claim) => (
            <Card key={claim.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-semibold">{claim.items?.title || "Item"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{claim.message}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{claim.status}</Badge>
                </div>

                {claim.status === "pending" && !claim.meeting_details && (
                  <p className="mt-4 text-sm text-muted-foreground">Waiting on the finder to accept or decline.</p>
                )}

                {claim.status === "approved" && (
                  <div className="mt-4 rounded-2xl bg-success/10 p-4">
                    <p className="text-sm font-medium">Accepted</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {claim.meeting_details || "Meet in a public campus spot. Check alerts for any extra note."}
                    </p>
                  </div>
                )}

                {claim.meeting_details && claim.status === "pending" && (
                  <div className="mt-4 rounded-2xl bg-muted/80 p-4">
                    <p className="text-sm font-medium">Meetup</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{claim.meeting_details}</p>
                  </div>
                )}

                {claim.status === "rejected" && (
                  <p className="mt-4 text-sm text-muted-foreground">Declined. You can look for another listing on the board.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4 space-y-3">
          {isLoading ? <SkeletonList /> : incomingClaims.length === 0 ? (
            <EmptyState text="No claims on your items yet." />
          ) : incomingClaims.map((claim) => (
            <Card key={claim.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-semibold">{claim.items?.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">From {claim.profiles?.full_name || "an SFIT member"}</p>
                  </div>
                  {claim.status !== "pending" && <Badge variant="secondary" className="capitalize">{claim.status}</Badge>}
                </div>

                <p className="mt-4 text-[15px] leading-relaxed">“{claim.message}”</p>

                {claim.status === "pending" && (
                  <form
                    className="mt-5 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const meetup = new FormData(event.currentTarget).get("meetup") as string;
                      resolveIncoming(claim.id, claim.item_id, "approved", meetup);
                    }}
                  >
                    <textarea
                      name="meetup"
                      placeholder="Optional meetup — Library entrance, 4 PM"
                      className="w-full rounded-2xl border bg-card p-3 text-sm"
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" type="submit">Accept</Button>
                      <Button size="sm" variant="outline" type="button" onClick={() => resolveIncoming(claim.id, claim.item_id, "rejected")}>
                        Decline
                      </Button>
                    </div>
                  </form>
                )}

                {claim.status === "approved" && claim.meeting_details && (
                  <p className="mt-4 text-sm text-muted-foreground">Meetup: {claim.meeting_details}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-3">
          {isLoading ? <SkeletonList /> : notifications.length === 0 ? (
            <EmptyState text="No notifications yet." />
          ) : notifications.map((notification) => (
            <Card key={notification.id} className={notification.read ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <span className="text-xs text-muted-foreground">{format(new Date(notification.created_at), "MMM d, h:mm a")}</span>
                </div>
                {!notification.read && (
                  <Button variant="ghost" size="sm" onClick={() => markNotifRead(notification.id)}>Mark read</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonList() {
  return <>{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-3xl bg-muted" />)}</>;
}

function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/80 py-16 text-center">
      <p className="text-[15px] text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
