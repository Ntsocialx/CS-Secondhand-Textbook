# Redesign Campus Exchange home page

## Goal

Apply the supplied design references and interface guidelines to the Campus Exchange
homepage, improving visual hierarchy, usability, accessibility, and responsive behavior
without changing marketplace scope.

## Design direction

- Preserve the existing Campus Exchange identity, TUT audience, established blue palette,
  book imagery, and current Popular Listings background image.
- Give the first viewport an editorial, art-directed composition: clear value proposition,
  concise supporting copy, and obvious Browse and Sell calls to action.
- Reduce the oversized centered-hero whitespace and improve the transition into catalog
  content.
- Make Popular Listings feel intentional and readable against the existing photo
  background; preserve the full static catalog, including manga, comics, and Bible items.
- Keep visual density calm, use consistent spacing and type hierarchy, and avoid excessive
  nested cards, pill controls, gradients, or decorative UI.

## Interaction and accessibility

- Remove the home page's decorative search field, campus selector, and subject chips if
  they remain nonfunctional. Do not present inert elements as interactive controls.
- Use semantic links for navigation to `/browse` and `/sell`.
- Ensure headings are hierarchical, focus states are visible, contrast is readable, and
  meaningful images have useful alt text.
- Respect reduced-motion preferences for any added motion.
- Preserve accessible responsive behavior on mobile and desktop.

## Scope

- Update the home page and, only if needed, narrowly scoped home-page presentation styles.
- Reuse established components, design tokens, and existing images; add no dependencies.
- Do not change API routes, authentication, listing data, filters, database behavior, or
  marketplace scope.
- Do not add unsupported claims, fabricated marketplace statistics, or payment/chat flows.

## Validation

- Run targeted lint and the frontend production build.
- Inspect the rendered homepage at desktop and mobile widths with the available browser
  tools.
- Verify Browse and Sell calls to action navigate to their existing routes, all catalog
  cards remain visible, and no horizontal overflow is introduced.
