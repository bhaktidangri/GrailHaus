import { supabase } from "../lib/supabaseClient";

export type AuthIdentifier = { method: "email"; value: string } | { method: "phone"; value: string };

export const authService = {
  async sendOtp(identifier: AuthIdentifier) {
    const { error } =
      identifier.method === "email"
        ? await supabase.auth.signInWithOtp({ email: identifier.value })
        : await supabase.auth.signInWithOtp({ phone: identifier.value });
    if (error) throw error;
  },

  async verifyOtp(identifier: AuthIdentifier, code: string) {
    const { error } =
      identifier.method === "email"
        ? await supabase.auth.verifyOtp({ email: identifier.value, token: code, type: "email" })
        : await supabase.auth.verifyOtp({ phone: identifier.value, token: code, type: "sms" });
    if (error) throw error;
  },

  /** Adds a second identifier to an already-signed-in session — prevents new account
   * fragmentation without needing a full account-merge flow. */
  async linkIdentifier(identifier: AuthIdentifier) {
    const { error } = await supabase.auth.updateUser(
      identifier.method === "email" ? { email: identifier.value } : { phone: identifier.value }
    );
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
};
