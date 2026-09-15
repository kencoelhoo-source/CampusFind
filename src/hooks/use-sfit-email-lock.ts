import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setEmailLockCache } from "@/lib/email";

export function useSfitEmailLock() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sfit-email-lock"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sfit_email_lock");
      if (error) throw error;
      const locked = Boolean(data);
      setEmailLockCache(locked);
      return locked;
    },
    staleTime: 15_000,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase.rpc("set_sfit_email_lock", { _enabled: enabled });
      if (error) throw error;
      return Boolean(data);
    },
    onSuccess: (locked) => {
      setEmailLockCache(locked);
      void queryClient.invalidateQueries({ queryKey: ["sfit-email-lock"] });
    },
  });

  return {
    locked: query.data ?? false,
    isLoading: query.isLoading,
    setLocked: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
