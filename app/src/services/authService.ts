import { supabase } from "../lib/supabaseClient";
import { apiGet, apiPost } from "./apiClient";

export const authService = {
  /** Returns whether a session came back immediately. If the Supabase project has "Confirm
   * email" turned on, signUp succeeds but returns no session until the user clicks the
   * confirmation link in their inbox — the caller shows a "check your email" step for that case
   * instead of a magic-link/deep-link flow. */
  async signUp(email: string, password: string): Promise<{ hasSession: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { hasSession: data.session != null };
  },

  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  checkUsernameAvailability(username: string) {
    return apiGet<{ username: string; available: boolean }>(`/username/availability?u=${encodeURIComponent(username)}`);
  },

  claimUsername(username: string) {
    return apiPost<{ username: string }>("/username", { username });
  },
};
