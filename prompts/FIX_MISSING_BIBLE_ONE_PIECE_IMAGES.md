# Fix missing Bible and One Piece images

## Goal

Make the Bible and One Piece cards render reliably in the home Popular Listings and
Browse catalogs.

## Scope

- Replace the broken One Piece Wikimedia URL with the verified direct Wikimedia image URL
  for a One Piece volume cover.
- Keep the Bible cover as a local public asset at `client/public/books/bible.png` and use
  its absolute public path in the catalog.
- Preserve the existing metadata, card layout, Popular Listings background, and Browse
  behavior.
- Keep the existing remote image host configuration only where still needed.
- Do not change APIs, authentication, database behavior, or marketplace scope.

## Validation

- Verify the new One Piece URL returns an image.
- Verify `client/public/books/bible.png` exists.
- Run the frontend production build and targeted lint.
- Confirm both entries remain mapped in the home and browse catalogs.
