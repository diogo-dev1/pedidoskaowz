import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  nome_vendedor: string;
  cargo: 'admin' | 'vendedor';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string, cargo: 'admin' | 'vendedor') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. Restaurar sessão e escutar mudanças
  useEffect(() => {
    let ativo = true;

    // Se o backend estiver reiniciando ou o refresh token estiver vencido,
    // nunca deixamos a tela presa em "carregando".
    const destravar = setTimeout(() => {
      if (ativo) setLoading(false);
    }, 8000);

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!ativo) return;
        if (error) {
          // Sessão inválida (token expirado / backend reiniciado): limpa e segue.
          console.warn('Sessão inválida, limpando:', error.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (!data.session) setLoading(false);
      })
      .catch(() => {
        if (ativo) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session || event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      ativo = false;
      clearTimeout(destravar);
      subscription.unsubscribe();
    };
  }, []);

  // 2. Buscar profile quando user muda (separado do auth para evitar loop)
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn('Falha ao carregar perfil:', error.message);
        setProfile((data as Profile | null) ?? null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string, cargo: 'admin' | 'vendedor') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome_vendedor: nome, cargo },
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
