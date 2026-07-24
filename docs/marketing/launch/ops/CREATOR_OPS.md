# Creator Operations — Prospecting & Outreach System

**Sheet:** `creators.csv` (this folder) — import into Google Sheets for day-to-day use; the CSV in git is the schema of record. One row per creator. **No real creators are pre-populated** — prospecting is a manual research task (Omar action; see `../16_OMAR_MANUAL_ACTIONS.md`). The single `c_example` row is a template — delete it after the first real entry.

## Column rules

| Column | Rule |
|---|---|
| `creator_id` | **Immutable.** `c_` + lowercase handle, assigned at prospect time, never reused or renamed — it is the attribution and payout key (`?creator=` in their link, F8 in `../10_ANALYTICS_EVENTS.md`). |
| `platform` / `handle` | One row per platform even for the same person (separate links). |
| `audience_category` | `personal-finance` · `career-money` · `self-improvement` · `student-money` · `tech-lifestyle` |
| `follower_count` / `recent_avg_views` | Snapshot at prospect time; average the last 10 posts, exclude the single biggest outlier. |
| `engagement_notes` | Comments-per-view ratio, whether they reply to comments, audience-age read from commenters. |
| `status` | `prospect` → `contacted` → `follow_up` → `negotiating` → `agreed` → `briefed` → `posted` → `paid` — or `declined` / `no_response` / `dropped`. Never delete rows; set status. |
| `quoted_price` / `negotiated_price` | Their first number / the agreed number. Blank until stated by them. |
| `affiliate_terms` | e.g. "flat per tracked connected user" — payouts are on **connected users via tracked link**, never claimed installs (see §22 of `../09_LAUNCH_COPY.md`). |
| `tracking_link` | Built ONLY from the template in `../15_LAUNCH_LINKS.md` (`utm_medium=creator`, their `creator_id`). |
| `content_concept` | The `V{NN}` concept offered (start with V01/V22/V23 — they demo well faceless). |
| `usage_rights` | `none` · `repost-with-credit` · `paid-usage-30d` · `full-buyout` — as agreed in writing. |
| `disclosure_status` | `pending` → `confirmed` — #ad/FTC disclosure verified **on the live post**. Non-negotiable; a missing disclosure is a takedown request, not a shrug. |
| `results_notes` | After posting: link clicks (campaign dashboard), 72h connected-user uplift, comment sentiment. |

## Sheets formulas (add after import — row 2 shown, drag down)

- **Days since outreach:** `=IF(J2="","",TODAY()-J2)`
- **Follow-up due flag:** `=IF(AND(L2="contacted",TODAY()>=K2),"FOLLOW UP","")`
- **Cost per connected user** (fill connected count in a new col U): `=IF(U2>0,N2/U2,"")`
- **Pipeline counts** (top summary row): `=COUNTIF(L:L,"contacted")`, `=COUNTIF(L:L,"agreed")`, etc.
- Conditional formatting: `status="follow_up"` → amber; `disclosure_status="pending"` AND `status="posted"` → red.

## Process (matches the 30-day calendar)

1. **Prospect** 20–30 creators (10–200k followers, faceless-friendly formats preferred). Fill a row at prospect time; assign `creator_id` immediately.
2. **Outreach** with the approved messages — do not improvise offers: cold email §18, short DM §19, 72h follow-up §20, UGC variant §21, affiliate upgrade §22 (all in `../09_LAUNCH_COPY.md`). Set `outreach_date`, `followup_date = +3 days`, status `contacted`.
3. **Only two content guardrails** (stated in every agreement): no guaranteed savings/outcome claims, and the bank connection is described as read-only. Plus FTC #ad disclosure. Everything else is their voice — that's the point.
4. **Brief on agreement:** demo account login (never real finances on camera), the `V{NN}` production package from `../production/`, their tracking link, the two guardrails, disclosure requirement, usage rights in writing.
5. **After posting:** verify disclosure on the live post → `disclosure_status=confirmed`; log results at 72h and 14d; pay on the agreed terms; top performers get the §22 affiliate offer.

## Claims discipline for creator content

Creator scripts do NOT need approval (per the offer), but if a live post makes a prohibited claim (guarantees, "moves your money for you", price numbers, fake outcomes), the playbook is: polite correction request with the exact line, offer a pinned-comment fix first, escalate to takedown only if it's outcome-fraud-level. Log the event in `results_notes`.
