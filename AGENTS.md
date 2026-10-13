# Architecture rules

- Manage simulator customization options within the existing simulator price configuration and its shared save action; this keeps all sellers on the same values without a separate catalog.
- Keep the first and included customization options protected from deletion because new simulator items use index-zero defaults.
- Invalidate the shared sales query after successful manual site-order synchronization and poll the sheet while sales views are open; this reflects scheduled imports without requiring another source of sales data.- Keep pronta-entrega classification and business-day rules in `supabase/functions/_shared/prontaEntrega.ts` mirrored byte-for-byte (except header) in `src/lib/prontaEntrega.ts`; front and server must classify items and compute deadlines identically.
- Pronta-entrega sync only updates Shopify-derived fields; shipping status, sender, tracking, notes, item sent flags and an already-chosen shipping mode are owned by the app and never overwritten.
- Pronta-entrega uses one deadline-sorted default list with completed orders last; existing status and urgency filters derive from the same records to keep counts consistent.
