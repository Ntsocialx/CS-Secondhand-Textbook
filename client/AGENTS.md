## 🛑 AI Coding Guardrails: Do’s and Don’ts

### 🎯 Scope & Feature Boundaries
* **DO** focus exclusively on the core MVP features:
  - Listing a book for sale (Title, Course Code, Price in ZAR, Condition: New/Good/Fair/Worn).
  - Browsing and filtering listings by Course Code or Department.
  - Revealing seller contact details (Phone number or in-app note).
  - Marking a listing as `Sold`.
* **DON'T** implement any out-of-scope features under any circumstances:
  - ❌ In-app payments or payment gateways (PayFast, Stripe).
  - ❌ Delivery or shipping tracking systems.
  - ❌ Real-time chat, messaging websockets, or price negotiation.
  - ❌ User ratings, reviews, or seller feedback scores.

---

### 🏗️ Tech Stack & Architecture
* **DO** strictly adhere to the approved technology stack:
  - **Frontend:** Next.js with React & Tailwind CSS.
  - **Backend:** Express.js REST API.
  - **Database:** PostgreSQL hosted on Neon DB.
  - **Deployment:** Vercel.
* **DO** keep a clean separation of concerns between frontend UI components and backend Express REST endpoints.
* **DON'T** introduce heavy or unnecessary third-party libraries (e.g., Redux, GraphQL, Socket.io, complex UI kits) when native React state and standard REST endpoints suffice.
* **DON'T** mix frontend database calls directly in Next.js components if the architecture routes requests through the Express REST API.

---

### 💾 Database & Data Modeling
* **DO** keep the Neon PostgreSQL schema simple and minimal (1–2 tables maximum, e.g., `listings` / `books`).
* **DO** sanitize user inputs and use parameterized SQL queries or a lightweight ORM/query builder to prevent SQL injection vulnerabilities.
* **DON'T** create complex multi-table relational schemas with unnecessary foreign key overhead for an MVP.
* **DON'T** store sensitive seller details unformatted or raw without input validation.

---

### 🔐 Security & Configuration
* **DO** store all sensitive environment variables (Neon Database URL, API Base URLs, Secret Keys) in `.env` / `.env.local` files.
* **DO** provide clear fallback error handling and user-friendly toast/alert notifications for failed network or API requests.
* **DON'T** hardcode database connection strings, API tokens, or localhost ports inside production code or commit them to GitHub.
* **DON'T** expose private seller contact information directly in public batch API responses—only reveal contact details on explicit endpoint trigger (`POST/GET /api/books/:id/contact`).

---

### 🎨 UI & User Experience
* **DO** ensure the UI is fully responsive and mobile-friendly using Tailwind CSS classes.
* **DO** display loading skeletons, spinners, and empty states when fetching listings or applying course code filters.
* **DON'T** build bloated, multi-step checkout wizards—keep the UI direct, lightweight, and focused on campus usability.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
