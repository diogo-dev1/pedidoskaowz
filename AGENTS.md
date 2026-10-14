# Architecture rules

- Manage simulator customization options within the existing simulator price configuration and its shared save action; this keeps all sellers on the same values without a separate catalog.
- Keep the first and included customization options protected from deletion because new simulator items use index-zero defaults.
- Invalidate the shared sales query after successful manual site-order synchronization and poll the sheet while sales views are open; this reflects scheduled imports without requiring another source of sales data.- Keep pronta-entrega classification and business-day rules in `supabase/functions/_shared/prontaEntrega.ts` mirrored byte-for-byte (except header) in `src/lib/prontaEntrega.ts`; front and server must classify items and compute deadlines identically.
- Pronta-entrega sync only updates Shopify-derived fields; shipping status, sender, tracking, notes and item sent flags belong to the app and are preserved.
- Shipping classification and editable lead time belong to each simulator item; the closing modal validates these answers without owning separate state, so reopening cannot reset them.
- Pronta-entrega ignores shipping modes; the dashboard lists all orders sorted by the deadline of their ready items, with square filter counters; made-to-order items never affect deadlines or shipping actions.
- Keep the shipping dashboard theme-inherited and presentation-only; reuse existing business-day helpers and shipment dialogs, and expose undo through responsive order details.
- Generate internal Shopify notes through the shared note formatter; preserve the ready-delivery block first and append order metadata last for narrow plain-text display.
- The shipping panel owns fullscreen and wake-lock lifecycle; Layout only observes its panel-mode event to hide navigation without remounting the page.
- Use distinct query keys when cached response shapes change; isolate shipping configuration rows from the legacy timestamp cache to keep existing sessions compatible.
