import { Link, useSearchParams, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { Bell, Package, Search, CheckCircle, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface DBItem {
  id: string;
  title: string;
  status: "lost" | "found" | "claimed" | "returned";
  created_at: string;
  user_id?: string;
}

interface DBClaim {
  id: string;
  item_id: string;
  user_id: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  verification_question: string | null;
  verification_answer: string | null;
  meeting_requested: boolean;
  meeting_details: string | null;
  appeal_message: string | null;
  items?: { title: string; user_id?: string; status?: string };
  profiles?: { full_name: string } | null;
}

interface DBNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface DashboardData {
  myItems: DBItem[];
  myClaims: DBClaim[];
  notifications: DBNotification[];
  incomingClaims: DBClaim[];
}

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

  const updateClaimStatus = async (
    claimId: string,
    status: "approved" | "rejected",
    itemId: string,
    approvedItemStatus: "claimed" | "returned" = "claimed",
  ) => {
    const { error } = await supabase.from("claims").update({ status: status as never }).eq("id", claimId);
    if (error) {
      toast.error(`Failed to update claim: ${error.message}`);
      return;
    }

    if (status === "approved") {
      const { error: itemError } = await supabase.from("items").update({ status: approvedItemStatus as never }).eq("id", itemId);

      if (itemError) {
        toast.error(`Claim updated, but item status failed: ${itemError.message}`);
        return;
      }
    }

    toast.success(`Claim ${status}`);
    await refreshQueries();
  };

  const updateClaim = async (
    claimId: string,
    payload: Partial<DBClaim>,
    successMsg: string,
  ) => {
    const { error } = await supabase.from("claims").update(payload as never).eq("id", claimId);

    if (error) {
      toast.error(`Error: ${error.message}`);
      return;
    }

    toast.success(successMsg);
    await refreshQueries();
  };

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Manage your items, claims, and notifications.</p>

      <Tabs defaultValue={defaultTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="my-items"><Package className="mr-1 h-4 w-4 hidden sm:block" /> My Items</TabsTrigger>
          <TabsTrigger value="my-claims"><Search className="mr-1 h-4 w-4 hidden sm:block" /> My Claims</TabsTrigger>
          <TabsTrigger value="incoming"><CheckCircle className="mr-1 h-4 w-4 hidden sm:block" /> Incoming</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            <Bell className="mr-1 h-4 w-4 hidden sm:block" /> Alerts
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-items" className="mt-4 space-y-3">
          {isLoading ? <SkeletonList /> : myItems.length === 0 ? (
            <EmptyState text="You haven't posted any items yet." action={<Button asChild><Link to="/post">Post an Item</Link></Button>} />
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
                    {(item.status === "found" || item.status === "claimed") && (
                      <Button size="sm" variant="outline" onClick={() => setItemStatus(item.id, "returned", "Item marked as returned")}>
                        Mark Returned
                      </Button>
                    )}
                    {item.status === "returned" && (
                      <Button size="sm" variant="outline" onClick={() => setItemStatus(item.id, "found", "Item reopened")}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen
                      </Button>
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
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{claim.items?.title || "Item"}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{claim.message}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{claim.status}</Badge>
                </div>

                {claim.status === "pending" && claim.verification_question && !claim.verification_answer && !claim.meeting_requested && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Reporter's Question:</p>
                    <p className="mt-1 text-sm">"{claim.verification_question}"</p>
                    <div className="mt-3">
                      <form onSubmit={(event) => {
                        event.preventDefault();
                        const answer = new FormData(event.currentTarget).get("answer") as string;
                        if (!answer.trim()) return;
                        updateClaim(
                          claim.id,
                          { verification_answer: answer },
                          "Answer submitted",
                        );
                      }}>
                        <textarea name="answer" placeholder="Your answer..." className="w-full rounded-md border bg-background p-2 text-sm" rows={2} required />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" type="submit">Submit Answer</Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => updateClaim(
                              claim.id,
                              { meeting_requested: true, verification_answer: null },
                              "Meeting requested",
                            )}
                          >
                            Request to Meet in Person instead
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {claim.meeting_requested && !claim.meeting_details && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">You requested to meet in person. Waiting for the reporter to suggest a time and place.</p>
                  </div>
                )}

                {claim.meeting_requested && claim.meeting_details && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Meeting Details from Reporter:</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{claim.meeting_details}</p>
                  </div>
                )}

                {claim.status === "rejected" && !claim.appeal_message && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm text-destructive">Claim was rejected. You can appeal by providing more details.</p>
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      const appeal = new FormData(event.currentTarget).get("appeal") as string;
                      if (!appeal.trim()) return;
                      updateClaim(
                        claim.id,
                        { appeal_message: appeal, status: "pending" },
                        "Appeal submitted",
                      );
                    }}>
                      <textarea name="appeal" placeholder="Describe where you lost it, identifying marks, and anything only the owner would know." className="w-full rounded-md border bg-background p-2 text-sm" rows={3} required />
                      <Button size="sm" type="submit" className="mt-2 w-full">Submit Appeal</Button>
                    </form>
                  </div>
                )}

                {claim.appeal_message && claim.status === "pending" && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Your Appeal:</p>
                    <p className="mt-1 text-sm">"{claim.appeal_message}"</p>
                    <p className="mt-2 text-xs text-muted-foreground">Waiting for reporter to re-review.</p>
                  </div>
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
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Claim on: {claim.items?.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">By: {claim.profiles?.full_name || "Anonymous"}</p>
                  </div>
                  {claim.status !== "pending" && <Badge variant="secondary" className="capitalize">{claim.status}</Badge>}
                </div>

                <p className="mt-4 text-sm italic">"{claim.message}"</p>

                {claim.status === "pending" && !claim.verification_question && !claim.appeal_message && (
                  <div className="mt-4">
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      const question = new FormData(event.currentTarget).get("question") as string;
                      if (!question.trim()) return;
                      updateClaim(
                        claim.id,
                        { verification_question: question },
                        "Question sent",
                      );
                    }}>
                      <p className="mb-1 text-sm font-medium">Verify Ownership (Optional)</p>
                      <div className="flex gap-2">
                        <input name="question" placeholder="e.g., What is the lock screen wallpaper?" className="flex-1 rounded-md border px-3 py-1 text-sm" required />
                        <Button size="sm" type="submit" variant="secondary">Ask Question</Button>
                      </div>
                    </form>

                    <div className="mt-4 flex gap-2 border-t pt-4">
                      <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Approve Claim</Button>
                      <Button size="sm" variant="outline" onClick={() => updateClaimStatus(claim.id, "rejected", claim.item_id)}>Reject</Button>
                    </div>
                  </div>
                )}

                {claim.status === "pending" && claim.verification_question && !claim.verification_answer && !claim.meeting_requested && (
                  <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-blue-800">You asked Verification Question: "{claim.verification_question}"</p>
                    <p className="mt-1 text-xs text-blue-600">Waiting for claimant to answer...</p>
                  </div>
                )}

                {claim.status === "pending" && claim.verification_question && claim.verification_answer && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Verification Result</p>
                    <p className="mt-2 text-sm text-muted-foreground">Your Q: {claim.verification_question}</p>
                    <p className="mt-1 text-sm font-semibold">Their A: {claim.verification_answer}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateClaimStatus(claim.id, "rejected", claim.item_id)}>Reject</Button>
                    </div>
                  </div>
                )}

                {claim.status === "pending" && claim.meeting_requested && !claim.meeting_details && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-800">Claimant wants to meet in person</p>
                    <form className="mt-2" onSubmit={(event) => {
                      event.preventDefault();
                      const details = new FormData(event.currentTarget).get("details") as string;
                      if (!details.trim()) return;
                      updateClaim(
                        claim.id,
                        { meeting_details: details },
                        "Meeting details sent",
                      );
                    }}>
                      <textarea name="details" placeholder="Where and when? e.g., Library cafe at 3 PM today." className="w-full rounded-md border bg-background p-2 text-sm" rows={2} required />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" type="submit">Send Details</Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => updateClaimStatus(claim.id, "rejected", claim.item_id)}>Reject Claim</Button>
                      </div>
                    </form>
                  </div>
                )}

                {claim.meeting_requested && claim.meeting_details && claim.status === "pending" && (
                  <div className="mt-4 rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Meeting Setup</p>
                    <p className="mt-1 text-sm">You suggested: {claim.meeting_details}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateClaimStatus(
                          claim.id,
                          "approved",
                          claim.item_id,
                          "returned",
                        )}
                      >
                        Mark as Returned
                      </Button>
                    </div>
                  </div>
                )}

                {claim.status === "pending" && claim.appeal_message && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-bold text-red-800">Appeal from Claimant</p>
                    <p className="mt-2 text-sm">"{claim.appeal_message}"</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => updateClaimStatus(claim.id, "approved", claim.item_id)}>Approve Appeal</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateClaim(
                          claim.id,
                          { status: "rejected" },
                          "Appeal rejected",
                        )}
                      >
                        Reject Again
                      </Button>
                    </div>
                  </div>
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
  return <>{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />)}</>;
}

function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
