import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  isReady: boolean;
  isSheetOpen: boolean;
  pendingAction: (() => void) | null;
  setSession: (session: Session | null) => void;
  setReady: (ready: boolean) => void;
  /** Runs `action` immediately if signed in; otherwise opens the auth sheet and
   * stashes `action` to run once sign-in completes. This is how the app stays
   * browsable without a login wall — auth surfaces only on intent. */
  requireAuth: (action: () => void) => void;
  closeSheet: () => void;
  resolvePendingAction: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isReady: false,
  isSheetOpen: false,
  pendingAction: null,
  setSession: (session) => set({ session }),
  setReady: (isReady) => set({ isReady }),
  requireAuth: (action) => {
    if (get().session) {
      action();
      return;
    }
    set({ isSheetOpen: true, pendingAction: action });
  },
  closeSheet: () => set({ isSheetOpen: false, pendingAction: null }),
  resolvePendingAction: () => {
    const action = get().pendingAction;
    set({ isSheetOpen: false, pendingAction: null });
    action?.();
  },
}));
