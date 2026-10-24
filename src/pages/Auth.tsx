import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ForjaAnimada } from '@/components/auth/ForjaAnimada';
import logo from '@/assets/kaowz-logo.png';
import forja from '@/assets/login-forja.webp';

/** Traduz os erros do Supabase Auth para algo que diga o problema e o que fazer. */
function mensagemErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos. Confira e tente de novo.';
  if (m.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado. Fale com o administrador.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  return `Não foi possível entrar: ${mensagem}`;
}

/** Entrada única da tela (o login é visto uma vez por dia — cabe um momento de marca). */
const ENTRADA =
  'animate-in fade-in slide-in-from-bottom-3 duration-500 [animation-fill-mode:both] ' +
  '[animation-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none';

export default function Auth() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Já logado: vai direto para a Home.
  if (user) return <Navigate to="/" replace />;

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await signIn(email.trim(), senha);

    if (error) {
      setErro(mensagemErro(error.message ?? ''));
      setCarregando(false);
      return;
    }
    navigate('/');
  };

  return (
    // "dark" troca os tokens do index.css para o tema escuro — combina com a foto e com a marca.
    <main className="dark min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* ── Foto da forja + marca ───────────────────────────── */}
      <section className="relative h-64 overflow-hidden sm:h-80 lg:h-auto">
        <img
          src={forja}
          alt="Faca artesanal Kaowz sobre a bigorna, ao lado do martelo"
          className="absolute inset-0 h-full w-full object-cover object-[50%_45%] animate-in fade-in duration-700 motion-reduce:animate-none"
        />
        {/* Véu neutro só para o texto ler sobre a foto (a única exceção de gradiente da skill). */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-background/40" />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-background/90 via-transparent to-transparent lg:block" />

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-12">
          {/* O logo é branco sobre preto: "screen" apaga o preto e deixa só a marca sobre a foto. */}
          <img src={logo} alt="Kaowz — Ferramentas de corte" className="h-11 w-auto mix-blend-screen lg:h-14" />
        </div>
      </section>

      {/* ── Formulário ─────────────────────────────────────── */}
      <section className="flex justify-center px-4 pb-12 pt-6 sm:px-6 sm:pt-10 lg:items-center lg:p-12">
        {/* Card do login: borda e um degrau de tom (bg-card) separam do fundo — sem sombra parada. */}
        <div className={cn('w-full max-w-sm rounded-lg border bg-card p-6 sm:p-8', ENTRADA)}>
          <header className="mb-8 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
            <p className="text-sm text-muted-foreground">Sistema de gestão da equipe Kaowz.</p>
          </header>

          <form onSubmit={entrar} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!erro}
                className="h-12 bg-card"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-senha">Senha</Label>
              <div className="relative">
                <Input
                  id="login-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  aria-invalid={!!erro}
                  aria-describedby={erro ? 'login-erro' : undefined}
                  className="h-12 bg-card pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={mostrarSenha}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Erro junto do formulário, não só num toast que some */}
            {erro && (
              <p
                id="login-erro"
                role="alert"
                className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive animate-in fade-in duration-200 motion-reduce:animate-none"
              >
                {erro}
              </p>
            )}

            <Button
              type="submit"
              disabled={carregando}
              className={cn(
                'h-12 w-full gap-2 text-base',
                'transition-[color,background-color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100',
              )}
            >
              {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
              {carregando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            Sem acesso ou esqueceu a senha? Fale com o administrador do sistema.
          </p>
          <ForjaAnimada className="mx-auto mt-5 mb-7 block w-40" />
        </div>
      </section>
    </main>
  );
}
