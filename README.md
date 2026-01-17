# Sakinorva Character Adapter

Generate Sakinorva cognitive function results for a fictional or historical character by letting OpenAI answer the 96-question test, then posting the answers to the official test page and rendering the results.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file:
   ```bash
   OPENAI_API_KEY=your_api_key_here
   # Database configuration (defaults to postgres)
   DATABASE_URL=postgres://user:password@localhost:5432/sakinorva
   # Optional: set to sqlite for local file storage
   # DB_DIALECT=sqlite
   # SQLITE_STORAGE=./data.sqlite
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000`.

## Docker

When using `docker-compose`, you can configure the host listening port by setting `HOST_PORT` in a `.env` file:

```bash
HOST_PORT=3000
```

## Notes

- OpenAI requests only run server-side in the `/api/run` route.
- Results are scraped from the official Sakinorva HTML response and rendered in the results view.
