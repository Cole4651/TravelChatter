# Travel Chatter

An AI-powered travel companion for business travelers — plan trips, collaborate with teammates, discover things to do, and chat with an assistant that knows your trip's context.

## Features

- **Accounts & per-trip workspaces** — register/login, create multiple trips, each with its own itinerary, wishlist, and chat history
- **Per-trip AI chat** — backed by Groq (Llama 3.3 70B). The assistant sees the trip's destination, dates, itinerary, wishlist, and recent messages
- **AI can add itinerary items** — tool/function calling; the assistant asks clarifying questions (date, time, airports, etc.) before adding anything
- **Collaborative trips** — invite other registered users by email. Collaborators can view the trip, chat with the AI, and submit itinerary *requests* that the owner approves/rejects
- **Tinder-style discovery** — on each trip, swipe through AI-generated activity suggestions. Swipe right = save to wishlist, swipe left = skip. Works with drag gestures or buttons
- **3D globe on My Trips** — destinations appear as purple dots on a rotating night-earth globe (Globe.gl + Three.js). Clicking a trip card flies the globe to that location
- **Geocoding** — destinations are geocoded via OpenStreetMap's Nominatim (free, no API key)
- **Rich itinerary** — flights, hotels, meetings, activities, and other items with dates, times, locations, and notes

## Tech Stack

- **Backend**: Node.js + Express, MongoDB (via Mongoose)
- **Auth**: bcrypt password hashing, JWT session tokens
- **AI**: Groq API with `llama-3.3-70b-versatile` (tool use enabled)
- **Geocoding**: OpenStreetMap Nominatim
- **Frontend**: Vanilla HTML/CSS/JS, dark-theme styling
- **3D Globe**: Globe.gl (Three.js wrapper) loaded from unpkg

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env`** (copy from `.env.example`)
   ```
   MONGODB_URI=<your MongoDB connection string>
   JWT_SECRET=<long random string>
   GROQ_API_KEY=<your Groq key>
   PORT=3000
   ```
   - MongoDB: use [Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or install locally
   - Groq: free tier at [console.groq.com](https://console.groq.com)
   - `JWT_SECRET`: generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Run**
   ```bash
   npm start
   ```
   Open `http://localhost:3000`.

## Pages

| Path | Purpose |
|------|---------|
| `/index.html` | Landing page |
| `/login.html` | Sign in |
| `/register.html` | Create account |
| `/trips.html` | My Trips — list + globe |
| `/new-trip.html` | Create a new trip |
| `/trip-members.html?id=X` | Manage people on a trip |
| `/trip.html?id=X` | Trip detail — itinerary, chat, wishlist, pending requests |
| `/explore.html?id=X` | Swipe-based activity discovery for a trip |

## How Chat Knows About the Trip

Every trip has its own chat history in MongoDB. On each user message, the server:
1. Loads the last 12 messages for that trip
2. Builds a system prompt with trip metadata (destination, dates, itinerary summary, wishlist, user role)
3. Calls Groq with an `add_itinerary_item` tool available
4. If the AI calls the tool, the server executes it (adding to itinerary for owners, creating a pending request for collaborators) and the AI confirms
5. Only the final text response is persisted

## Security

- Passwords hashed with bcrypt
- JWT payload contains only email — no sensitive data
- `helmet` for standard security headers + Content Security Policy
- Rate limits: auth (10 / 15min per IP), chat (20/min per user), AI suggestions (10/hour per user), general API (60/min per user)
- Input length caps on all user-supplied fields to bound prompt-injection surface and DoS risk
- AI prompts explicitly mark trip context and user messages as untrusted data
- `.env` gitignored and never committed
- MongoDB connection uses TLS (`ssl=true`)

## Data Model (MongoDB)

- **User** — email, passwordHash
- **Trip** — userId (owner), name, destination, lat/lng, startDate, endDate, purpose, status, itinerary[], wishlist[], members[], itineraryRequests[]
- **ChatMessage** — tripId, role (user/assistant), content, createdAt
