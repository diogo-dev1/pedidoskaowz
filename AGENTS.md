# Architecture rules

- Campaigns and Novidades share OfertaVisual for identical cards/media/detail rendering; campaign defaults are adapted at the page boundary and Shopify refresh updates only source-owned price/media/link fields.
- Campaign writes use the existing server-side is_admin check and public reads require both campaign and item active, so private drafts never leak through direct item queries.
- Campaign extras use a reusable library and per-item ordered links with campaign-only render slots in OfertaVisual; Shopify refresh updates library source fields, never special link prices, to preserve Novidades and manual campaign conditions.

- Home chart calendar aggregation uses Sao Paulo's current date and UTC calendar arithmetic in a pure helper; keep its period and drill-down totals sourced solely from the existing sales rows.

- Manage simulator customization options within the existing simulator price configuration and its shared save action; this keeps all sellers on the same values without a separate catalog.
- Keep the first and included customization options protected from deletion because new simulator items use index-zero defaults.
- Invalidate the shared sales query after successful manual site-order synchronization and poll the sheet while sales views are open; this reflects scheduled imports without requiring another source of sales data.
- Keep pronta-entrega classification and business-day rules in `supabase/functions/_shared/prontaEntrega.ts` mirrored byte-for-byte (except header) in `src/lib/prontaEntrega.ts`; front and server must classify items and compute deadlines identically.
- Pronta-entrega sync only updates Shopify-derived fields; viewing, case/certificate progress, shipping status, notes, item sent flags and manual tracking belong to the app and are preserved.
- Shipping classification and editable lead time belong to each simulator item; the closing modal validates these answers without owning separate state, so reopening cannot reset them.
- Pronta-entrega uses New / Upcoming / Sent columns (mobile tabs), ordered by payment / ready-item deadline / shipment respectively; made-to-order items never affect deadlines or shipping actions.
- Keep shipping views theme-inherited; share order types and helpers in pedidoPE, use responsive order details, and complete shipments with a sender-free confirmation while retaining bulk selection.
- Generate internal Shopify notes through the shared note formatter; preserve the ready-delivery block first and append order metadata last for narrow plain-text display.
- The shipping panel owns fullscreen and wake-lock lifecycle; Layout only observes its panel-mode event to hide navigation without remounting the page.
- Use distinct query keys when cached response shapes change; isolate shipping configuration rows from the legacy timestamp cache to keep existing sessions compatible.

- All Bling functions share paced API transport and refresh recovery; verify Shopify numeroLoja exactly before accepting a tracking match, and preserve manual tracking.
- Privileged Bling and order functions validate callers through the shared auth helper before using server credentials; this prevents anonymous access while preserving scheduled server calls.
- Abandoned-checkout screen and push alerts both read Shopify through `supabase/functions/_shared/checkoutsShopify.ts`; notified carts must match the screen exactly.
