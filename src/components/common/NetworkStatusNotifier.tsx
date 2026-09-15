import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { WifiOff, Wifi } from "lucide-react";

export function NetworkStatusNotifier() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      if (wasOffline.current) {
        toast.success("Connection restored", {
          description: "You are back online. CampusFind is synced.",
          icon: <Wifi className="h-4 w-4 text-emerald-500" />,
          duration: 3500,
        });
        wasOffline.current = false;
      }
    };

    const handleOffline = () => {
      wasOffline.current = true;
      toast.warning("You are currently offline", {
        description: "Network connection lost. Submissions will fail until reconnected.",
        icon: <WifiOff className="h-4 w-4 text-amber-500" />,
        duration: 8000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}
