# Reverb API Documentation & Integration Notes

## 1. Endpoint & Authentication
- **Public Search Endpoint:** `GET https://api.reverb.com/api/listings?query=<q>&condition=used&per_page=50`
- **Required Headers:**
  - `Accept: application/hal+json`
  - `Accept-Version: 3.0`
  - `User-Agent: GuitarBot/0.1 (contact: bedlamthebandbedlam@gmail.com)`
- **Auth:** Public listing search functions without API key authentication. Live listings only (sold price history is internal/undocumented).

## 2. Sample Data & Response Schema
- Sample fixture saved in [`fixtures/reverb-listings.sample.json`](file:///c:/Users/rob_b/Ryff/fixtures/reverb-listings.sample.json).

### Field Names:
- `id` (string): Unique listing ID (e.g. `"12345678"`).
- `title` (string): Listing headline.
- `make` (string): Brand / manufacturer (e.g. `"Fender"`).
- `model` (string): Instrument model (e.g. `"Stratocaster"`).
- `finish` (string): Finish color.
- `year` (string): Production year.
- `price` (object):
  - `amount` (string): Numerical price string (e.g. `"850.00"`).
  - `currency` (string): Currency ISO code (`"GBP"`, `"USD"`).
  - `display` (string): Formatted string (e.g. `"£850.00"`).
- `condition` (object):
  - `display_name` (string): E.g. `"Excellent"`, `"Mint"`, `"Used"`.
  - `uuid` (string): Slug e.g. `"used-excellent"`.
- `_links.web.href` (string): Deep link URL to the listing.

## 3. Rate Limits & Terms
- Politeness limit: 1 request/second per host.
- Max pagination cap: 2,500 listings per query (50 pages × 50 results).
- All outbound listing links are routed through `/api/out` with affiliate disclosure.
