import { useEffect, type ReactNode } from "react";
import { Modal } from "react-native";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";
import { AuthScreen } from "../screens/AuthScreen";

/**
 * Root-level wiring: hydrates the auth store from Supabase's session (initial
 * check + live changes), and hosts the auth sheet that `requireAuth()`
 * (see state/authStore.ts) opens on demand. Nothing here is a ViewModel —
 * this is app-shell plumbing, same role as the QueryClientProvider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setReady = useAuthStore((s) => s.setReady);
  const isSheetOpen = useAuthStore((s) => s.isSheetOpen);
  const closeSheet = useAuthStore((s) => s.closeSheet);
  const resolvePendingAction = useAuthStore((s) => s.resolvePendingAction);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_IN") resolvePendingAction();
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setReady, resolvePendingAction]);

  return (
    <>
      {children}
      <Modal visible={isSheetOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeSheet}>
        <AuthScreen onClose={closeSheet} />
      </Modal>
    </>
  );
}
