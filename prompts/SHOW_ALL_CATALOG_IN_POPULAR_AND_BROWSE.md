# Show all catalog listings in Popular Listings and Browse

## Goal

Ensure the newly added manga, comic-book, and Bible listings appear in both the home
page's Popular Listings section and the browse page's catalog preview.

## Scope

- Update the home page Popular Listings mapping so it includes all entries from the static
  `books` catalog rather than truncating after six items.
- Keep the browse page mapping over the complete `books` catalog.
- Preserve the existing cards, links, filters, online images, and background styling.
- Do not change API routes, authentication, database behavior, or marketplace scope.

## Validation

- Run the frontend production build.
- Run targeted lint for the home and browse pages.
- Confirm the home page renders One Piece, The Amazing Spider-Man, and The Holy Bible.
- Confirm the browse page catalog renders all three new entries.
