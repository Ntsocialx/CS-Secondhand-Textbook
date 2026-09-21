# Use user-provided book images

## Goal

Use the user's specified image sources for the One Piece, Spider-Man, and Bible catalog
entries.

## Scope

- Resolve the One Piece Wikipedia page to a direct stable image URL for the manga cover;
  do not use the Wikipedia HTML page as an image source.
- Replace the Spider-Man image with the exact user-provided Google-hosted image URL.
- Copy the user-provided Bible cover attachment into `client/public/books/bible.png` and
  use `/books/bible.png` for the Bible listing.
- Add only the necessary remote image host configuration for any newly used host.
- Keep listing metadata, links, card layout, and Popular Listings/Browse behavior unchanged.
- Do not change APIs, authentication, database behavior, or marketplace scope.

## Validation

- Verify each final image URL is a direct image resource.
- Run the frontend production build.
- Run targeted lint for the catalog and Next image configuration.
- Confirm the three entries remain visible on the home Popular Listings and Browse catalogs.
