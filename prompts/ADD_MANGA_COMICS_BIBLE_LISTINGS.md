# Add manga, comics, and Bible listings

## Goal

Restore manga, comic-book, and Bible entries to the static marketplace catalog with
online-sourced imagery so they appear consistently in the home and browse catalogs.

## Scope

- Add three catalog entries to `client/lib/marketplace.ts`:
  - One Piece manga
  - The Amazing Spider-Man comic
  - The Holy Bible
- Give each entry a stable HTTPS image URL from the already configured remote image host.
- Keep the existing `Book` type, card layout, prices, conditions, campus, and seller fields.
- Keep the Popular Listings background and existing academic textbook entries unchanged.
- Ensure `getStockBookImage` can return these images for matching course codes.
- Do not change API routes, authentication, database behavior, or marketplace scope.

## Validation

- Run the frontend production build.
- Run targeted lint for the changed catalog file.
- Confirm all three entries have image URLs and appear in the catalog data.
