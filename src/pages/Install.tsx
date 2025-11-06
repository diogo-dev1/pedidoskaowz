import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-24 h-24 mx-auto bg-foreground rounded-lg flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-background" />
          </div>
          
          <h1 className="text-3xl font-medium tracking-tight">Instalar Kaowz</h1>
          
          {isInstalled ? (
            <div className="space-y-4">
              <CheckCircle2 className="w-16 h-16 mx-auto text-foreground" />
              <p className="text-muted-foreground">
                O app já está instalado no seu dispositivo
              </p>
              <Button onClick={() => window.location.href = '/'} className="w-full">
                Abrir App
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Instale o Kaowz Blade Builder no seu celular para acesso rápido e experiência otimizada
              </p>

              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Funciona offline</p>
                    <p className="text-sm text-muted-foreground">Acesse mesmo sem internet</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Tela cheia</p>
                    <p className="text-sm text-muted-foreground">Experiência nativa sem navegador</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Acesso rápido</p>
                    <p className="text-sm text-muted-foreground">Ícone na tela inicial</p>
                  </div>
                </div>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Instalar Agora
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="border border-border p-4 space-y-2">
                    <p className="text-sm font-medium">Como instalar:</p>
                    <div className="text-sm text-muted-foreground text-left space-y-1">
                      <p><strong>iPhone/iPad:</strong></p>
                      <p>1. Toque no ícone de compartilhar</p>
                      <p>2. Selecione "Adicionar à Tela de Início"</p>
                      <p className="mt-2"><strong>Android:</strong></p>
                      <p>1. Toque no menu do navegador (⋮)</p>
                      <p>2. Selecione "Adicionar à tela inicial"</p>
                    </div>
                  </div>
                  
                  <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
                    Continuar no Navegador
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
