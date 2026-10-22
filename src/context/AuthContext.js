import React, { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const REDIRECT_URL = 'com.idataone.meragame://auth/callback';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = not yet known
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Seed state if onAuthStateChange hasn't fired yet
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(prev => {
        if (prev === undefined) {
          setUser(session?.user ?? null);
          return session;
        }
        return prev;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);

    if (result.type !== 'success' || !result.url) {
      // User cancelled or browser failed — not an error
      return;
    }

    // Parse the returned URL to confirm code is present
    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (!code) {
      // Sometimes the URL comes back as a hash fragment (implicit flow fallback)
      const hashParams = new URLSearchParams(url.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        // Implicit token — set session directly
        const { error: setErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        if (setErr) throw setErr;
        return;
      }
      throw new Error('No auth code returned. Check your Supabase redirect URL matches: ' + REDIRECT_URL);
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
    if (exchangeError) throw exchangeError;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
