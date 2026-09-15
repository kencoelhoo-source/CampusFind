import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hrefForNotification } from "@/lib/notification-routing";
import { showDesktopNotification } from "@/services/notifications";

interface RealtimeNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  kind?: string | null;
  related_item_id?: string | null;
  related_claim_id?: string | null;
}

export function useNotificationRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["unread-notifications-count", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
    };

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as RealtimeNotification;
          const href = hrefForNotification(row);
          refresh();

          if (document.visibilityState === "visible") {
            toast.info(row.title, { description: row.message });
          } else {
            showDesktopNotification(row.title, row.message, href);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claims",
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
}
