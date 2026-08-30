import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import { loadCustomerAccount, signOutCustomer, type CustomerAddress, type CustomerProfile } from '../services/customerAuthService';
import { clearOrderConfirmation } from '../utils/orderConfirmationStorage';
import { clearCustomerSessionCache } from '../utils/customerSessionPrivacy';

type CustomerAuthState = {
  session: Session | null;
  user: User | null;
  profile: CustomerProfile | null;
  addresses: CustomerAddress[];
  loading: boolean;
  accountLoading: boolean;
  profileComplete: boolean;
  refreshAccount: () => Promise<void>;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const authenticatedUserId = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);

  const refreshAccount = useCallback(async () => {
    const user = (await requireSupabase().auth.getUser()).data.user;
    if (!user) { setProfile(null); setAddresses([]); return; }
    setAccountLoading(true);
    try {
      const account = await loadCustomerAccount(user.id);
      setProfile(account.profile);
      setAddresses(account.addresses);
    } finally { setAccountLoading(false); }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const client = requireSupabase();
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void refreshAccount().finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (authenticatedUserId.current !== nextUserId) {
        clearOrderConfirmation();
        clearCustomerSessionCache(queryClient);
        setProfile(null);
        setAddresses([]);
      }
      authenticatedUserId.current = nextUserId;
      setSession(nextSession);
      window.setTimeout(() => { if (nextSession) void refreshAccount(); }, 0);
    });
    return () => subscription.subscription.unsubscribe();
  }, [queryClient, refreshAccount]);

  const logout = useCallback(async () => {
    clearOrderConfirmation();
    clearCustomerSessionCache(queryClient);
    await signOutCustomer();
    authenticatedUserId.current = null;
    setSession(null);
    setProfile(null);
    setAddresses([]);
  }, [queryClient]);
  const value = useMemo<CustomerAuthState>(() => ({
    session, user: session?.user ?? null, profile, addresses, loading, accountLoading,
    profileComplete: Boolean(profile && addresses.some((address) => address.is_default)), refreshAccount, logout,
  }), [session, profile, addresses, loading, accountLoading, refreshAccount, logout]);
  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthState {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider.');
  return context;
}
