REVOKE EXECUTE ON FUNCTION public.recalcular_metricas_clientes(BIGINT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_metricas_clientes(BIGINT[]) TO service_role;