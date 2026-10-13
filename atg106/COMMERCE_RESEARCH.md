# Future cosmetic commerce — researched, inactive

Current source: Project 0's official skill.md, “Selling things in your game”, retrieved for Directive 004. The current API supports `p0.buy({id, name, price, once})`, with permanent purchases exposed through `p0.purchases`. Cosmetic skins, paint schemes, accent lighting and ATG visual trim are feasible future uses.

The platform opens its own purchase confirmation UI; the experience does not collect payment credentials. Documented prices are whole tokens, 1–5,000. A permanent cosmetic normally uses `once: true`. The platform's documented split is 90% to the creator and 10% to the project fund. New accounts can buy after 12 hours. These are documented platform rules, not activated offers or revenue guarantees.

Suggested future structure:

- Keep the three launch pods and every launch cosmetic free.
- Introduce an explicit opt-in cosmetic catalogue with stable item IDs, e.g. `atg.paint.eclipse`, `atg.light.aurora` and `atg.trim.event-horizon`.
- Set prices only after owner approval. Deliver the cosmetic immediately after `ok: true`; handle `again` and `cancelled` without pressure or repeated prompts.
- Restore owned permanent cosmetics from the documented `p0.purchases` collection on entry, using the purchase's item identifier. Confirm exact returned fields in a non-charging owner test when implementation is authorised.
- Keep cosmetics visually distinct but performance-neutral: no paid acceleration, steering, energy or leaderboard advantages.
- Avoid external networking or local storage; let Project 0 retain purchase ownership.

**Current implementation has no p0.buy call, no store UI, no prices, no sales or spending.** It provides 3 pods × 5 paints × 3 light colours × 2 fin configurations = 90 free combinations. No commerce endpoints or account changes were used during construction.
