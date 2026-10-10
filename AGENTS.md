# Architecture rules

- Manage simulator customization options within the existing simulator price configuration and its shared save action; this keeps all sellers on the same values without a separate catalog.
- Keep the first and included customization options protected from deletion because new simulator items use index-zero defaults.
- Invalidate the shared sales query after successful manual site-order synchronization and poll the sheet while sales views are open; this reflects scheduled imports without requiring another source of sales data.