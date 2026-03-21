
CREATE TABLE public.preview_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid REFERENCES public.modelos(id) ON DELETE CASCADE NOT NULL UNIQUE,
  lateral_x numeric NOT NULL DEFAULT 4500,
  lateral_y numeric NOT NULL DEFAULT 5200,
  lateral_font_size numeric NOT NULL DEFAULT 420,
  lateral_font_family text NOT NULL DEFAULT 'serif',
  lateral_rotation numeric NOT NULL DEFAULT -2,
  lateral_letter_spacing numeric NOT NULL DEFAULT 3,
  lateral_color text NOT NULL DEFAULT '#1a1a1a',
  dorso_x numeric NOT NULL DEFAULT 5000,
  dorso_y numeric NOT NULL DEFAULT 3600,
  dorso_font_size numeric NOT NULL DEFAULT 280,
  dorso_font_family text NOT NULL DEFAULT 'monospace',
  dorso_rotation numeric NOT NULL DEFAULT -1.5,
  dorso_letter_spacing numeric NOT NULL DEFAULT 5,
  dorso_color text NOT NULL DEFAULT '#2a2a2a',
  logo_x numeric NOT NULL DEFAULT 14150,
  logo_y numeric NOT NULL DEFAULT 3460,
  logo_width numeric NOT NULL DEFAULT 500,
  logo_height numeric NOT NULL DEFAULT 500,
  viewbox_width numeric NOT NULL DEFAULT 25000,
  viewbox_height numeric NOT NULL DEFAULT 10000,
  imagem_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.preview_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver preview_config" ON public.preview_config FOR SELECT TO public USING (true);
CREATE POLICY "Admins podem inserir preview_config" ON public.preview_config FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'));
CREATE POLICY "Admins podem atualizar preview_config" ON public.preview_config FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'));
CREATE POLICY "Admins podem deletar preview_config" ON public.preview_config FOR DELETE TO public USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'));
