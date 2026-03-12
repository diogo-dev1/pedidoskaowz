
-- Albums table
CREATE TABLE public.albuns_midia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  capa_url text,
  ordem integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.albuns_midia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver álbuns" ON public.albuns_midia FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Autenticados podem inserir álbuns" ON public.albuns_midia FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Autenticados podem atualizar álbuns" ON public.albuns_midia FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Autenticados podem deletar álbuns" ON public.albuns_midia FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Album images table
CREATE TABLE public.imagens_album (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albuns_midia(id) ON DELETE CASCADE,
  url text NOT NULL,
  nome_arquivo text NOT NULL,
  legenda text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.imagens_album ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver imagens" ON public.imagens_album FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.albuns_midia WHERE id = imagens_album.album_id AND user_id = auth.uid()));
CREATE POLICY "Autenticados podem inserir imagens" ON public.imagens_album FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.albuns_midia WHERE id = imagens_album.album_id AND user_id = auth.uid()));
CREATE POLICY "Autenticados podem deletar imagens" ON public.imagens_album FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.albuns_midia WHERE id = imagens_album.album_id AND user_id = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('album-midias', 'album-midias', true);

CREATE POLICY "Autenticados podem upload album-midias" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'album-midias');
CREATE POLICY "Todos podem ver album-midias" ON storage.objects FOR SELECT USING (bucket_id = 'album-midias');
CREATE POLICY "Autenticados podem deletar album-midias" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'album-midias');

-- Trigger for updated_at
CREATE TRIGGER update_albuns_midia_updated_at BEFORE UPDATE ON public.albuns_midia FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
