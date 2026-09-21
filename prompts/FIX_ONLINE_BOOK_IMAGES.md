# Fix online textbook images

## Goal

Make textbook images visible across the home page, browse catalog, listing details, and
user listings by loading the static catalog covers from a stable online image host instead
of missing local `/books/*.png` files.

## Scope

- Update the static catalog data in `client/lib/marketplace.ts` so every catalog book has a
  valid HTTPS image URL hosted online.
- Keep the existing `Book` shape and visual styling intact.
- Configure `client/next.config.ts` for the selected remote image host so `next/image`
  can render the URLs in production and development.
- Preserve uploaded/API-provided `listing.imageUrl` values. When a listing has no image,
  continue using `getStockBookImage(courseCode)` as its fallback.
- Ensure the same fallback works for browse cards, book details, and My Listings without
  changing authentication, API contracts, database behavior, or marketplace scope.
- Keep alt text meaningful and preserve responsive/object-cover behavior.

## Implementation requirements

- Use stable direct image URLs (not a search page, redirect, or expiring URL).
- Do not add an image library or unrelated dependencies.
- Do not remove support for user-uploaded data URLs accepted by the existing sell flow.
- If the chosen URL host requires Next image configuration, add the narrowest possible
  `remotePatterns` entry rather than allowing all remote hosts.
- Use the existing components and helpers; avoid duplicating URL-selection logic.

## Validation

- Run the frontend lint command and TypeScript/build validation available in `client`.
- Verify that the home page catalog cards show images, the browse preview catalog shows
  images, and a book details page shows its cover.
- Verify that an API listing with no `imageUrl` still displays an online fallback and that
  an API listing with an image URL still displays its supplied image.
- Check that no missing `/books/*.png` paths remain in the static catalog.
