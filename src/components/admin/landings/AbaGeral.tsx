import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { gerarSlug, slugValido, type LandingEdicao } from '@/lib/landings';
import { Campo } from './Campo';
import { MidiaCampo } from './MidiaCampo';
import type { AtualizarLanding } from './tipos';

interface Props {
  landing: LandingEdicao;
  atualizar: AtualizarLanding;
  slugManual: boolean;
  setSlugManual: (v: boolean) => void;
  /** Slug que está no banco (avisa ao mudar endereço já divulgado). */
  slugSalvo: string | null;
}

export function AbaGeral({ landing, atualizar, slugManual, setSlugManual, slugSalvo }: Props) {
  const slugOk = !landing.slug || slugValido(landing.slug);
  const mudouEndereco = !!slugSalvo && landing.slug !== slugSalvo;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <Campo rotulo="Título" htmlFor="landing-titulo" ajuda="Nome da categoria. Aparece na aba do navegador e na lista de landings.">
          <Input
            id="landing-titulo"
            value={landing.titulo}
            maxLength={120}
            placeholder="Ex.: Porte velado"
            onChange={(e) => {
              atualizar('titulo', e.target.value);
              if (!slugManual) atualizar('slug', gerarSlug(e.target.value));
            }}
          />
        </Campo>

        <Campo
          rotulo="Endereço"
          htmlFor="landing-slug"
          ajuda={
            !slugOk ? (
              <span className="text-destructive">Use só letras minúsculas, números e hífen, sem hífen no começo ou no fim.</span>
            ) : mudouEndereco ? (
              <span className="text-warning">Mudar o endereço quebra os links que já foram divulgados.</span>
            ) : (
              'Gerado a partir do título. Só letras minúsculas, números e hífen.'
            )
          }
        >
          <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="select-none pl-3 text-sm text-muted-foreground">/categoria/</span>
            <input
              id="landing-slug"
              value={landing.slug}
              aria-invalid={!slugOk}
              onChange={(e) => {
                setSlugManual(true);
                atualizar('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
              className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-base outline-none md:text-sm"
            />
          </div>
        </Campo>

        <Campo rotulo="Frase de abertura" htmlFor="landing-frase" ajuda="A frase grande da primeira tela. Curta e direta: é o que aparece ao compartilhar o link.">
          <Textarea
            id="landing-frase"
            rows={2}
            value={landing.frase_abertura ?? ''}
            placeholder="Ex.: Ninguém precisa saber. Mas você precisa ter."
            onChange={(e) => atualizar('frase_abertura', e.target.value || null)}
          />
        </Campo>

        <Campo rotulo="Subtítulo" htmlFor="landing-subtitulo" ajuda="Uma linha abaixo da frase, explicando o que a pessoa vai encontrar.">
          <Input
            id="landing-subtitulo"
            value={landing.subtitulo ?? ''}
            placeholder="Ex.: Lâminas feitas para andar com você sem aparecer."
            onChange={(e) => atualizar('subtitulo', e.target.value || null)}
          />
        </Campo>

        <Campo
          rotulo="Mensagem de WhatsApp"
          htmlFor="landing-whatsapp"
          ajuda='Texto que o cliente envia ao tocar em "Falar com um vendedor". O nome da lâmina entra no fim automaticamente.'
        >
          <Textarea
            id="landing-whatsapp"
            rows={2}
            value={landing.mensagem_whatsapp ?? ''}
            placeholder="Ex.: Olá! Vi a página de porte velado da Kaowz e quero saber mais"
            onChange={(e) => atualizar('mensagem_whatsapp', e.target.value || null)}
          />
        </Campo>
      </div>

      <div className="space-y-5">
        <Campo
          rotulo="Capa"
          ajuda="Foto ou vídeo que ocupa a primeira tela. Vídeo toca mudo e em loop. Escolha uma imagem que funcione cortada na vertical do celular."
        >
          <MidiaCampo
            idBase="capa"
            url={landing.capa_url}
            tipo={landing.capa_tipo}
            pasta={landing.slug || 'nova'}
            onChange={(url, tipo) => {
              atualizar('capa_url', url);
              atualizar('capa_tipo', tipo);
            }}
          />
        </Campo>

        <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <label htmlFor="landing-publicada" className="text-sm font-medium">
              Publicada
            </label>
            <p className="text-xs leading-4 text-muted-foreground">
              Desligada, a landing é um rascunho: só admins veem, pelo botão "Ver prévia".
            </p>
          </div>
          <Switch id="landing-publicada" checked={landing.publicada} onCheckedChange={(v) => atualizar('publicada', v)} />
        </div>
      </div>
    </div>
  );
}
