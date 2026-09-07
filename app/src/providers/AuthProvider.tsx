import { useEffect, type ReactNode } from "react";
import { Modal } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { profileService } from "../services/profileService";
import { reconcilePendingPurchase } from "../lib/pendingPurchase";
import { useAuthStore } from "../state/authStore";
import { AuthScreen } from "../screens/AuthScreen";

/**
 * Root-level wiring: hydrates the auth store from Supabase's session (initial
 * check + live changes), and hosts the account sheet that `requireAuth()`
 * (see state/authStore.ts) opens on demand. Nothing here is a ViewModel —
 * this is app-shell plumbing, same role as the QueryClientProvider.
 *
 * The account sheet also force-reopens, independent of `isSheetOpen`,
 * whenever there's a session with no Collector ID claimed yet — the one way
 * that can happen is the app getting killed between registering and
 * claiming (the normal in-flow case is handled inside the sheet itself,
 * before it ever closes). This is what makes "every account has a
 * Collector ID" actually hold, not just true for the happy path.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setReady = useAuthStore((s) => s.setReady);
  const session = useAuthStore((s) => s.session);
  const isSheetOpen = useAuthStore((s) => s.isSheetOpen);
  const closeSheet = useAuthStore((s) => s.closeSheet);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setReady]);

  useEffect(() => {
    if (!session) return;
    // Runs once per app launch with a session — catches a purchase that was still in flight
    // when the app was last killed. See lib/pendingPurchase.ts for why this is a client-side
    // nicety, not a correctness dependency: the server already settled the purchase either way.
    reconcilePendingPurchase().then(() => queryClient.invalidateQueries({ queryKey: ["profile", "me"] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session != null]);

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: profileService.getCurrent,
    enabled: session != null,
  });

  const needsUsername = session != null && profileQuery.data != null && !profileQuery.data.username;
  const visible = isSheetOpen || needsUsername;

  return (
    <>
      {children}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={needsUsername ? undefined : closeSheet}
      >
        <AuthScreen
          key={needsUsername ? "claim" : "sheet"}
          onClose={needsUsername ? undefined : closeSheet}
          initialStep={needsUsername ? "claim-username" : undefined}
        />
      </Modal>
    </>
  );
}
