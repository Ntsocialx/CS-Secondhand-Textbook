# Fix Bible asset path

## Goal

Make the supplied Bible cover render without authentication.

## Scope

- Move the supplied Bible image from the protected `/books/` public path to a neutral
  public asset path such as `client/public/catalog/bible.png`.
- Update the Bible catalog entry to use `/catalog/bible.png`.
- Keep the image content, listing metadata, Popular Listings, and Browse behavior unchanged.
- Do not weaken or bypass authentication protection for `/books/[id]`.
- Do not change APIs, authentication, database behavior, or marketplace scope.

## Validation

- Request the new asset path and confirm it is served as an image rather than redirected
  to login.
- Run the frontend production build and targeted lint.
- Confirm no catalog image still references `/books/bible.png`.
