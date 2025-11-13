# Basecamp Speed Loader

A simple Next.js application to quickly load project breakdowns into Basecamp 3 using markdown format.

## Features

- OAuth 2.0 integration with Basecamp 3
- Parse markdown into todo lists and todos
- Select any Basecamp project
- Batch create todo lists with todos
- No database required - stateless operation
 
## Setup

### 1. Create a Basecamp OAuth Application

1. Go to [Basecamp Launchpad](https://launchpad.37signals.com/integrations)
2. Sign in with your Basecamp account
3. Click "Register one now" to create a new integration
4. Fill in the details:
   - **Name**: Basecamp Speed Loader (or your preferred name)
   - **Company/Organization**: Your company name
   - **Website URL**: Your website
   - **Redirect URI**: `http://localhost:3000/api/auth/callback` (for development)
   - **Products**: Select "Basecamp 3"
5. Save and note your `Client ID` and `Client Secret`

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Basecamp credentials:
   ```env
   BASECAMP_CLIENT_ID=your_client_id_here
   BASECAMP_CLIENT_SECRET=your_client_secret_here
   BASECAMP_REDIRECT_URI=http://localhost:3000/api/auth/callback
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Connect to Basecamp

Click the "Connect to Basecamp" button and authorize the application to access your Basecamp account.

### 2. Select a Project

Choose the Basecamp project where you want to create the todo lists.

### 3. Enter Your Project Breakdown

Write your project breakdown in markdown format:

```markdown
# Project Tasks
## Design Phase
- Create wireframes
- Design mockups
- Get client approval

## Development Phase
- Set up project structure
- Implement authentication
- Build main features
- Write tests

# Launch Phase
- Deploy to production
- Monitor for issues
- Gather user feedback
```

**Format Rules:**
- `#` headers create todo lists
- `##` headers create task groups (nested within the current list)
- Bullet points (`-` or `*`) become todos in the current group or list

### 4. Create Todo Lists

Click "Create Todo Lists" to send your breakdown to Basecamp. The app will:
1. Create a todo list for each `#` header
2. Create task groups for each `##` header within lists
3. Add all bullet points as todos under their respective lists or groups
4. Show a success message when complete

## Markdown Format

The parser converts markdown to Basecamp todo lists following these rules:

- **Level 1 headers** (`#`) create new todo lists
- **Level 2 headers** (`##`) create task groups within the current todo list
- **List items** (`-` or `*`) create todos in the current group (if active) or directly in the list
- Empty lines are ignored
- If there are list items before any header, they're grouped under a "Tasks" list

### Example

Input markdown:
```markdown
# Project Tasks
## Frontend Work
- Design homepage
- Implement navigation

## Backend Work
- Set up API endpoints
- Add authentication

# Another List
- Standalone task
```

Creates:
- Todo List: "Project Tasks"
  - Group: "Frontend Work"
    - Todo: "Design homepage"
    - Todo: "Implement navigation"
  - Group: "Backend Work"
    - Todo: "Set up API endpoints"
    - Todo: "Add authentication"
- Todo List: "Another List"
  - Todo: "Standalone task"

## API Endpoints

- `GET /api/auth/login` - Initiate OAuth flow
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/projects` - Fetch user's Basecamp projects
- `POST /api/create-todos` - Create todo lists and todos

## Development

### Project Structure

```
basecamp-speed-loader/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # OAuth initiation
│   │   │   └── callback/route.ts   # OAuth callback
│   │   ├── projects/route.ts       # Fetch projects
│   │   └── create-todos/route.ts   # Create todos
│   ├── layout.tsx
│   ├── page.tsx                    # Main UI
│   └── globals.css
├── lib/
│   ├── basecamp.ts                 # Basecamp API client
│   └── markdown-parser.ts          # Markdown parser
├── .env.example
├── package.json
└── README.md
```

### Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Basecamp 3 API** - Project management integration

## Security Notes

- This app stores access tokens in URL parameters for simplicity
- For production use, implement proper session management or encrypted cookies
- Never commit your `.env` file with real credentials
- Use HTTPS in production

## Troubleshooting

### "Missing OAuth configuration" Error

Make sure your `.env` file has all required variables set:
- `BASECAMP_CLIENT_ID`
- `BASECAMP_CLIENT_SECRET`
- `BASECAMP_REDIRECT_URI`

### "No Basecamp account" Error

Ensure your Basecamp account has access to Basecamp 3 (not Basecamp Classic or Basecamp 2).

### OAuth Redirect Issues

Make sure the redirect URI in your `.env` matches exactly what you configured in the Basecamp integration settings.

## License

MIT

## Support

For issues or questions, please check the Basecamp 3 API documentation:
https://github.com/basecamp/bc3-api
