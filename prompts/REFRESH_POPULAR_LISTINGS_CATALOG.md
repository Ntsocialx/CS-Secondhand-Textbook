# Refresh popular listings catalog imagery

## Goal

Refresh the static Popular Listings catalog with real textbook titles and realistic
online book-cover imagery, and use the Macroeconomics listing cover from
`/books/macro` as the visual background for the Popular Listings section on the home page.

## Scope

- Replace the current mock catalog titles with recognizable real-world academic textbook
  titles across computer science, economics, mathematics, engineering, and science.
- Use stable HTTPS image URLs for real book or textbook photography/covers.
- Keep the existing `Book` type and card layout unless a small styling adjustment is needed
  for readability.
- Add the selected Macroeconomics cover as a subtle full-section background behind the
  Popular Listings area, with a readable overlay so existing text and cards remain clear.
- Keep the existing online-image host configuration and fallback behavior.
- Preserve links, course codes, prices, conditions, and seller display behavior unless the
  replacement catalog data requires updating those values.
- Do not change API routes, authentication, database behavior, or marketplace scope.

## Implementation requirements

- The home page Popular Listings section must remain accessible and responsive.
- Use a background image with `background-image` or an absolutely positioned image layer;
  do not put the image behind text without a contrast overlay.
- Keep cards readable and avoid changing card image loading behavior.
- Use direct, stable image URLs, not search pages or expiring URLs.
- Add only the narrowest remote image configuration needed.
- Preserve meaningful alt text for each textbook cover.

## Validation

- Run the frontend lint command and production build.
- Confirm the home page renders the new titles and cover images.
- Confirm the Popular Listings background is visible but does not reduce text/card contrast.
- Confirm `/books/macro` still resolves and its cover remains available.
