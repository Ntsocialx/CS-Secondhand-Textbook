## Codebase Exploration Report & Plan

### 1. API Endpoints identified in `server/server.js`
The following endpoints are defined in the server:
- `POST /api/auth/register`: User registration.
- `POST /api/auth/login`: User authentication.
- `GET /api/listings`: Search and filter active textbook listings.
- `GET /api/listings/:id`: Get details for a specific listing.
- `GET /api/my-listings`: Get listings created by the authenticated user.
- `POST /api/listings`: Create a new textbook listing.
- `PATCH /api/listings/:id`: Update an existing listing.
- `POST /api/listings/:id/sold`: Mark a listing as sold.
- `POST /api/analytics/visits`: Track visitor page views.
- `GET /api/analytics/summary`: Get analytics summary (Admin only).
- `GET /`: Basic server health/status message.
- `GET /health`: Detailed health check.

### 2. Incorrectly Nested Routes
**Critical Bug Found:**
All `/api/listings` route handlers (from `GET /api/listings` to `POST /api/listings/:id/sold`) are incorrectly defined *inside* the `app.post('/api/auth/login', ...)` route handler. 
- This means these routes are not available on server startup.
- They are re-registered every time a user hits the `/api/auth/login` endpoint.
- This is a severe architectural error that must be fixed by moving these handlers to the top level of the `app` instance.

### 3. User Profile Logic Analysis
The system currently does not support names or gender.
- **Database (`server/server.js`)**: The `users` table schema (lines 355-365) only contains `id`, `email`, `password_hash`, `phone`, `contact_display_consent`, `popia_consented_at`, `popia_consent_version`, `role`, and `created_at`.
- **Registration (`server/server.js` & `client/components/AuthForm.tsx`)**: The registration process only collects email, password, and phone.
- **UI (`client/app/seller/page.tsx`)**: The seller profile page is currently a static mock-up with hardcoded data ("Thabo").

### Planned Actions

#### Phase 1: Fix Routing Bug
- Move all `/api/listings` route handlers out of the `/api/auth/login` handler and into the main application scope in `server/server.js`.

#### Phase 2: Support Names and Gender
1.  **Database Update**:
    - Update the `users` table schema in `server/server.js` to include `first_name` (TEXT) and `gender` (TEXT).
2.  **Backend Update**:
    - Modify `POST /api/auth/register` to accept `first_name` and `gender` from the request body and store them in the database.
    - Update `POST /api/auth/login` to return `first_name` and `gender` in the user object.
3.  **Frontend Update**:
    - Modify `client/components/AuthForm.tsx` to include input fields for `First Name` and `Gender` (e.g., a dropdown) during registration.
    - Ensure the registration API call sends these new fields.
4.  **Profile UI Update**:
    - Update `client/app/seller/page.tsx` to fetch and display the actual authenticated user's (or the seller's) name instead of the hardcoded "Thabo".
