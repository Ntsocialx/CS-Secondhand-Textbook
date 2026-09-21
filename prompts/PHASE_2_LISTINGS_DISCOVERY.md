# Phase 2: Listings and Discovery
## Sprint 2.1 + 2.2 + 2.3 Combined Implementation

### Overview
This phase transforms the static mockup listings into a fully persisted, discoverable marketplace. Students can create, browse, filter, and manage real listings with images and ownership controls.

### Data Model

#### Listings Table Schema
```sql
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Core listing fields
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_code VARCHAR(50),
  
  -- Pricing and condition
  price DECIMAL(10, 2) NOT NULL,
  condition VARCHAR(50) NOT NULL CHECK (condition IN ('like-new', 'excellent', 'good', 'fair')),
  
  -- Campus/University
  university VARCHAR(100) DEFAULT 'TUT',
  campus VARCHAR(100),
  
  -- Lifecycle
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'archived')),
  
  -- Image
  image_data TEXT, -- base64 data URL for now (production: move to object storage)
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_campus (campus),
  INDEX idx_course_code (course_code),
  INDEX idx_condition (condition),
  INDEX idx_created_at (created_at)
);
```

---

### Sprint 2.1: Listing Persistence and Creation

#### Goals
- Turn the "Sell" screen into a working listing creation workflow
- Persist listings with ownership verification
- Validate inputs server-side

#### Deliverables

1. **Create Listing Endpoint**
   - `POST /api/listings`
   - Authentication: Bearer token required (JWT)
   - Request body:
     ```json
     {
       "title": "Calculus: Early Transcendentals (9th Edition)",
       "course_code": "MTH1001",
       "price": 450.00,
       "condition": "excellent",
       "description": "Minimal annotations, pristine binding.",
       "university": "TUT",
       "campus": "Pretoria Main",
       "image_data": "data:image/jpeg;base64,/9j/4AA..."
     }
     ```
   - Response (201):
     ```json
     {
       "success": true,
       "listing": {
         "id": "uuid",
         "user_id": "uuid",
         "title": "...",
         "price": 450.00,
         "condition": "excellent",
         "status": "active",
         "created_at": "2026-09-21T09:00:00Z"
       }
     }
     ```
   - Error responses:
     - 400: Missing required fields (title, price, condition)
     - 400: Invalid price (< 0, not numeric)
     - 400: Invalid condition (not in list)
     - 401: No token or invalid token
     - 413: Image too large (> 5MB)

2. **Validation Rules (Server-side)**
   - Title: required, 3-255 characters
   - Course code: optional, 2-20 characters if provided
   - Price: required, 0.00-9999.99, numeric
   - Condition: required, one of: `like-new`, `excellent`, `good`, `fair`
   - Description: optional, max 2000 characters
   - University: default "TUT", max 100 chars
   - Campus: optional but recommended, max 100 chars (validate if provided)
   - Image: optional, validate base64 format, check file size before insertion

3. **Ownership Enforcement**
   - Listing always owned by authenticated user (extracted from token)
   - No way for user to set `user_id` in request
   - Validation error if attempting to create on behalf of another user

4. **Database Persistence**
   - Use parameterized SQL (prepared statements via `pg` library)
   - Insert successful listings with `status = 'active'`
   - Draft support optional (can defer to Sprint 2.3)
   - Return created listing with ID and timestamps

#### Acceptance Criteria
- [ ] Authenticated student can create a valid listing
- [ ] Listing persists in database with `status = 'active'`
- [ ] Invalid price, condition, or missing title → 400 with specific error message
- [ ] Image too large → 413 with helpful message
- [ ] Created listing can be retrieved after page refresh (test in Sprint 2.3)
- [ ] Student cannot create listing on behalf of another user
- [ ] Non-authenticated requests → 401
- [ ] All inputs validated and normalized server-side

---

### Sprint 2.2: Images and Browsing

#### Goals
- Connect browse and details screens to real database records
- Implement filtering (course code, campus, condition)
- Validate image uploads and provide fallback display

#### Deliverables

1. **Public Listing Browse Endpoint**
   - `GET /api/listings?filters...`
   - Authentication: optional (anyone can browse)
   - Query parameters:
     ```
     GET /api/listings?campus=Pretoria Main&condition=excellent&course_code=MTH&limit=20&offset=0
     ```
   - Response (200):
     ```json
     {
       "success": true,
       "total": 42,
       "limit": 20,
       "offset": 0,
       "listings": [
         {
           "id": "uuid",
           "title": "Calculus: Early Transcendentals",
           "course_code": "MTH1001",
           "price": 450.00,
           "condition": "excellent",
           "campus": "Pretoria Main",
           "university": "TUT",
           "status": "active",
           "image_data": "data:image/jpeg;base64,..." (optional; check config),
           "created_at": "2026-09-21T09:00:00Z"
         }
       ]
     }
     ```

2. **Filter Support**
   - `campus`: exact match or partial (if partial, use LIKE)
   - `condition`: exact match against enum
   - `course_code`: partial match (LIKE)
   - `status`: default to `active` only (never show drafts/archived to public)
   - Pagination: `limit` (default 20, max 100) + `offset` (default 0)
   - Sort: optional `sort_by` (e.g., `created_at`, `price`) + `sort_order` (`asc`/`desc`)

3. **Image Upload Validation**
   - Accept `image_data` as base64 data URL (e.g., `data:image/jpeg;base64,...`)
   - Validate MIME type: only `image/jpeg`, `image/png`, `image/webp`
   - Validate size: max 5MB (check decoded base64 length)
   - On invalid image: reject with 400 + "Image must be JPEG, PNG, or WebP, max 5MB"
   - On success: store in database as base64 (production: migrate to S3 or similar)

4. **Fallback Image Handling**
   - If listing has no image or image failed validation: frontend displays fallback image
   - Fallback: static `/images/book-placeholder.png` (must exist in `client/public/images/`)
   - Backend response can include `has_image: true/false` flag

5. **Listing Detail Endpoint**
   - `GET /api/listings/{id}`
   - Authentication: optional
   - Response includes full listing + seller name (email hidden unless contact reveal in Sprint 3)
   - Returns 404 if listing not found or status is not `active`

6. **Loading, Empty, and Error States**
   - Browse page shows skeleton/spinner while fetching
   - Empty state: "No listings found. Try adjusting your filters." with button to clear filters
   - Error state: "Unable to load listings. Please try again."
   - All states have helpful messaging

#### Acceptance Criteria
- [ ] Browse results come from database (not static mock data)
- [ ] Filters (campus, condition, course_code) change returned results
- [ ] Pagination works (limit/offset)
- [ ] Listing images validate file type and size
- [ ] Missing images use fallback placeholder
- [ ] Sold/draft/archived listings hidden from public browse
- [ ] Loading state appears while fetching
- [ ] Empty state displays when no results
- [ ] Error state displays on API failure
- [ ] Detail page retrieves real listing from API
- [ ] Sort order works (created_at, price, optional others)

---

### Sprint 2.3: Listing Lifecycle and Ownership

#### Goals
- Complete the seller's listing management flow
- Implement mark-as-sold and edit capabilities
- Enforce ownership authorization

#### Deliverables

1. **My Listings Endpoint**
   - `GET /api/my-listings`
   - Authentication: Bearer token required
   - Response (200):
     ```json
     {
       "success": true,
       "listings": [
         {
           "id": "uuid",
           "title": "Calculus...",
           "price": 450.00,
           "status": "active",
           "created_at": "2026-09-21T09:00:00Z"
         }
       ]
     }
     ```
   - Includes all statuses (active, draft, sold, archived) for owner only
   - Pagination optional for MVP (may add offset/limit in follow-up)
   - Unauthenticated: 401

2. **Mark as Sold Endpoint**
   - `PATCH /api/listings/{id}/mark-sold`
   - Authentication: Bearer token required
   - Request body: empty or `{ "status": "sold" }`
   - Response (200):
     ```json
     {
       "success": true,
       "listing": { "id": "uuid", "status": "sold", "updated_at": "..." }
     }
     ```
   - Authorization: only listing owner can mark sold
   - If not owner: 403 "You do not have permission to modify this listing"
   - If listing not found: 404
   - If already sold: 400 "This listing is already marked as sold"
   - Sold listings no longer appear in public browse (filtered by `status = 'active'`)

3. **Edit Listing Endpoint**
   - `PATCH /api/listings/{id}`
   - Authentication: Bearer token required
   - Request body: any subset of fields
     ```json
     { "title": "...", "price": 500.00, "description": "..." }
     ```
   - Validation: same as create (title, price, condition, etc.)
   - Authorization: only listing owner
   - Response (200): updated listing
   - Cannot edit if `status = 'sold'` (return 400 "Cannot edit sold listings")
   - Cannot change `user_id` or `status` via PATCH (ignore if provided)

4. **Delete/Archive Behavior** (optional for MVP)
   - `DELETE /api/listings/{id}` — soft delete (set `status = 'archived'`)
   - Only accessible to owner
   - Archived listings hidden from public and owner "My Listings"
   - Can optionally allow un-archive via separate endpoint or status reset

5. **Frontend: My Listings Page**
   - Fetch from `/api/my-listings` on load
   - Display cards showing: title, price, status badge, created date
   - Status badges: `active` (green), `sold` (gray), `draft` (yellow), `archived` (hidden or dim)
   - Actions per card:
     - View details
     - Edit (if active/draft)
     - Mark as sold (if active)
     - Delete/archive (if active)
   - Empty state: "You haven't listed any books yet. Create your first listing."

6. **Ownership Authorization Middleware**
   - Helper function to check if authenticated user owns listing
   - Usage: before PATCH/DELETE, verify `req.user.id === listing.user_id`
   - Return 403 if mismatch

#### Acceptance Criteria
- [ ] Authenticated student sees only their own listings in My Listings
- [ ] Active listing card shows edit/mark-sold actions
- [ ] Mark as sold changes status in database
- [ ] Sold listing no longer appears in public browse
- [ ] Sold listing cannot receive new exchange requests (tested in Phase 3)
- [ ] Only owner can edit listing
- [ ] Non-owner accessing edit endpoint → 403
- [ ] Edit validates inputs (price, condition, etc.)
- [ ] Cannot edit sold listings → 400
- [ ] Listing ownership verified server-side (not client-side trust)
- [ ] My Listings page shows loading + empty states

---

### Image Storage: Current vs. Production

**MVP (Current):**
- Store base64 data URL directly in `listings.image_data` column
- Pros: simple, no infrastructure dependency
- Cons: bloats database, poor scalability, slow retrieval

**Production Recommendation:**
- Migrate to object storage (AWS S3, Azure Blob, Cloudinary, etc.)
- Store only a URL or object key in database
- Upload endpoint returns signed URL or direct storage credentials
- Frontend uploads directly to storage or via backend relay
- Update browse/detail responses to return HTTPS image URLs

---

### API Route Summary (Phase 2)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/listings | Yes | Create listing |
| GET | /api/listings | No | Browse + filter |
| GET | /api/listings/{id} | No | Detail view |
| GET | /api/my-listings | Yes | Owner's listings |
| PATCH | /api/listings/{id} | Yes | Edit listing |
| PATCH | /api/listings/{id}/mark-sold | Yes | Mark as sold |
| DELETE | /api/listings/{id} | Yes | Archive/delete |

---

### Testing Checklist

#### Sprint 2.1
- [ ] Create valid listing → persists with `status = 'active'`
- [ ] Create with missing title → 400
- [ ] Create with negative price → 400
- [ ] Create with invalid condition → 400
- [ ] Create with image > 5MB → 413
- [ ] Create unauthenticated → 401
- [ ] Refresh page and retrieve created listing via detail endpoint

#### Sprint 2.2
- [ ] Browse without filters → all active listings
- [ ] Filter by campus → results match
- [ ] Filter by condition → results match
- [ ] Filter by course code (partial) → results match
- [ ] Sold listing → hidden from browse
- [ ] Listing detail page loads → no 404
- [ ] Image missing → fallback placeholder displays
- [ ] Pagination (offset/limit) → correct page of results
- [ ] Loading state visible during fetch
- [ ] Empty state: filter with no results → displays message
- [ ] Error state: simulate API failure → friendly error message

#### Sprint 2.3
- [ ] My Listings: authenticated user → sees only own listings
- [ ] My Listings: unauthenticated → 401
- [ ] Mark as sold: owner → succeeds, status → 'sold'
- [ ] Mark as sold: non-owner → 403
- [ ] Sold listing: no longer in browse results
- [ ] Edit listing: owner, valid data → succeeds
- [ ] Edit listing: non-owner → 403
- [ ] Edit listing: sold status → 400
- [ ] Edit listing: invalid price → 400
- [ ] My Listings page: empty state when no listings
- [ ] My Listings page: cards show status badge

---

### Implementation Order
1. Create `listings` table and run migrations
2. Implement create-listing endpoint with validation
3. Implement browse endpoint with filtering and pagination
4. Implement listing detail endpoint
5. Implement my-listings endpoint
6. Implement mark-sold and edit endpoints
7. Add ownership authorization checks
8. Connect frontend components to API
9. Test all flows end-to-end

### Out of Scope (Phase 2)
- Real-time notifications when listing created
- Search by title (regex/full-text search can defer)
- Price range filtering (can add in future sprint)
- Advanced sorting (multiple fields, etc.)
- Drafts (can add in future if needed)
- Comments or inline discussions
- Seller ratings or reviews
- Wishlist/favorites feature
