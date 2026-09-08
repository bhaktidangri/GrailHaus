import { useEffect, type ReactNode } from "react";
import { Modal } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authToken } from "../lib/authToken";
import { profileService } from "../services/profileService";
import { reconcilePendingPurchase } from "../lib/pendingPurchase";
import { useAuthStore } from "../state/authStore";
import { AuthScreen } from "../screens/AuthScreen";
import { AccountScreen } from "../screens/AccountScreen";

/**
 * Root-level wiring: hydrates the auth store from the token persisted in
 * SecureStore (see lib/authToken.ts — there's no live "auth state changed"
 * event source now that this isn't Supabase; sign-in/up/out set the store
 * directly, see authService.ts), and hosts the account sheet that
 * `requireAuth()` (see state/authStore.ts) opens on demand. Nothing here is
 * a ViewModel — this is app-shell plumbing, same role as the
 * QueryClientProvider.
 *
 * The account sheet also force-reopens, independent of `isSheetOpen`,
 * whenever there's a session with no Collector ID claimed yet — the one way
 * that can happen is the app getting killed between registering and
 * claiming (the normal in-flow case is handled inside the sheet itself,
 * before it ever closes). This is what makes "every account has a
 * Collector ID" actually hold, not just true for the happy path.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setToken = useAuthStore((s) => s.setToken);
  const setReady = useAuthStore((s) => s.setReady);
  const token = useAuthStore((s) => s.token);
  const isSheetOpen = useAuthStore((s) => s.isSheetOpen);
  const closeSheet = useAuthStore((s) => s.closeSheet);
  const isAccountSheetOpen = useAuthStore((s) => s.isAccountSheetOpen);
  const closeAccountSheet = useAuthStore((s) => s.closeAccountSheet);
  const queryClient = useQueryClient();

  useEffect(() => {
    authToken.get().then((stored) => {
      setToken(stored);
      setReady(true);
    });
  }, [setToken, setReady]);

  useEffect(() => {
    if (!token) return;
    // Runs once per app launch with a session — catches a purchase that was still in flight
    // when the app was last killed. See lib/pendingPurchase.ts for why this is a client-side
    // nicety, not a correctness dependency: the server already settled the purchase either way.
    reconcilePendingPurchase().then(() => queryClient.invalidateQueries({ queryKey: ["profile", "me"] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token != null]);

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: profileService.getCurrent,
    enabled: token != null,
  });

  const needsUsername = token != null && profileQuery.data != null && !profileQuery.data.username;
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
      <Modal visible={isAccountSheetOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeAccountSheet}>
        <AccountScreen onClose={closeAccountSheet} />
      </Modal>
    </>
  );
}
