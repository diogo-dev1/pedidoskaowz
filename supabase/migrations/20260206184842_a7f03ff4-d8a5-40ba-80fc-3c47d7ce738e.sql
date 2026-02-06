-- Create table for custom lead statuses
CREATE TABLE public.situacoes_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT 'blue',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.situacoes_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own statuses"
  ON public.situacoes_leads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own statuses"
  ON public.situacoes_leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statuses"
  ON public.situacoes_leads
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statuses"
  ON public.situacoes_leads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_situacoes_leads_updated_at
  BEFORE UPDATE ON public.situacoes_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();