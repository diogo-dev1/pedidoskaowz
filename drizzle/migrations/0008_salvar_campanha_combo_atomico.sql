CREATE OR REPLACE FUNCTION public.salvar_campanha_combo(p_item_id uuid, p_nome text, p_descricao_curta text, p_preco numeric, p_destaque boolean, p_extras uuid[], p_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid; v_ordem integer;
BEGIN
 IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Não autorizado' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.campanha_itens WHERE id=p_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
 IF nullif(btrim(p_nome),'') IS NULL OR p_preco IS NULL OR p_preco < 0 THEN RAISE EXCEPTION 'Nome e preço inválidos'; END IF;
 IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.campanha_combos WHERE id=p_id AND campanha_item_id=p_item_id) THEN RAISE EXCEPTION 'Combo não encontrado'; END IF;
 IF p_destaque THEN UPDATE public.campanha_combos SET destaque=false WHERE campanha_item_id=p_item_id AND destaque; END IF;
 IF p_id IS NULL THEN
 SELECT coalesce(max(ordem),-1)+1 INTO v_ordem FROM public.campanha_combos WHERE campanha_item_id=p_item_id;
 INSERT INTO public.campanha_combos(campanha_item_id,nome,descricao_curta,preco,destaque,ordem) VALUES(p_item_id,btrim(p_nome),left(regexp_replace(p_descricao_curta,E'[\n\r]+',' ','g'),80),p_preco,p_destaque,v_ordem) RETURNING id INTO v_id;
 ELSE
 v_id:=p_id;
 UPDATE public.campanha_combos SET nome=btrim(p_nome),descricao_curta=left(regexp_replace(p_descricao_curta,E'[\n\r]+',' ','g'),80),preco=p_preco,destaque=p_destaque WHERE id=v_id;
 END IF;
 DELETE FROM public.campanha_combo_extras WHERE combo_id=v_id;
 INSERT INTO public.campanha_combo_extras(combo_id,extra_id,ordem) SELECT v_id,extra_id,(min(pos)-1)::integer FROM unnest(coalesce(p_extras,'{}'::uuid[])) WITH ORDINALITY AS x(extra_id,pos) GROUP BY extra_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.salvar_campanha_combo(uuid,text,text,numeric,boolean,uuid[],uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_campanha_combo(uuid,text,text,numeric,boolean,uuid[],uuid) TO authenticated,service_role;