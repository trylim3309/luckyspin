# Lucky Spin

A production-ready Lucky Spin wheel game with Telegram authentication, admin dashboard, and secure spin result generation.

## Features

### Public Website
- Fun, colorful casino-style landing page
- Telegram Login Widget authentication
- Telegram Mini App authentication
- Interactive spin wheel with smooth animations
- Confetti effect on wins
- Balance tracking and spin limits
- Recent winners display

### Admin Panel
- Secure email/password authentication
- Dashboard with statistics and analytics
- Prize management (CRUD)
- Spin conditions control
- Result control (force win/lose, probabilities)
- User management (block, edit balance)
- Complete spin history with filters

### Security
- Telegram hash verification on backend
- Session-based authentication
- Rate limiting on spin endpoints
- Atomic prize stock updates
- Result generation only on server

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **UI Components**: shadcn/ui, Radix UI, Framer Motion
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Custom JWT + Session tokens

## Setup

### Prerequisites

- Node.js 22+
- PostgreSQL database
- Telegram Bot Token (from @BotFather)

### Installation

1. Clone the repository:
```bash
cd luckyspin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/luckyspin"
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database with demo data:
```bash
npx prisma db seed
```

6. Start the development server:
```bash
npm run dev
```

### Default Admin Credentials

After seeding, you can login with:
- Email: `admin@luckyspin.com`
- Password: `admin123`

## Project Structure

```
luckyspin/
├── prisma/
│   ├── schema.prisma       # Database models
│   └── seed.ts             # Demo data
├── src/
│   ├── app/
│   │   ├── (public)/       # Public pages
│   │   │   ├── page.tsx    # Home page
│   │   │   ├── login/      # Login page
│   │   │   └── spin/       # Spin game page
│   │   ├── (admin)/        # Admin pages
│   │   │   └── admin/      # Dashboard, prizes, etc.
│   │   ├── admin/login/    # Admin login
│   │   └── api/            # API routes
│   ├── components/
│   │   ├── ui/             # shadcn components
│   │   ├── spin/           # Spin wheel components
│   │   ├── admin/          # Admin components
│   │   └── public/         # Public components
│   ├── lib/
│   │   ├── prisma.ts       # Prisma client
│   │   ├── auth.ts         # Auth.js configuration
│   │   ├── telegram.ts     # Telegram verification
│   │   └── spin-algorithm.ts # Secure spin logic
│   └── types/
│       └── index.ts        # TypeScript types
└── .env                    # Environment variables
```

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/telegram` | POST | Telegram Widget login |
| `/api/auth/telegram-miniapp` | POST | Telegram Mini App login |
| `/api/admin-login` | POST | Admin login |

### Spin (Authenticated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/spin` | POST | Execute a spin |
| `/api/spin/history` | GET | User's spin history |
| `/api/spin/remaining` | GET | Remaining spins |

### Admin (Authenticated Admin)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/dashboard` | GET | Dashboard stats |
| `/api/admin/prizes` | GET/POST | List/Create prizes |
| `/api/admin/prizes` | PUT/DELETE | Update/Delete prize |
| `/api/admin/conditions` | GET/POST | List/Create conditions |
| `/api/admin/result-control` | GET/POST | Get/Set result control |
| `/api/admin/users` | GET | List users |
| `/api/admin/users` | PATCH | Update user |
| `/api/admin/spin-history` | GET | All spin history |

## Telegram Login Setup

1. Create a bot via @BotFather in Telegram
2. Get your bot token
3. Configure your login widget with the bot username

For production, you need to:
1. Set up a valid HTTPS endpoint for the widget
2. Add your domain to the bot's allowed domains

## Database Schema

The project uses PostgreSQL with the following main models:

- **AdminUser**: Admin panel users
- **User**: Telegram users who can spin
- **Prize**: Available prizes with probabilities
- **SpinCondition**: Rules for spin limits and requirements
- **ResultControl**: Spin result manipulation rules
- **SpinResult**: History of all spins
- **CampaignSetting**: Campaign configuration
- **DailySpinCount**: Daily spin tracking per user

## Security Considerations

1. **Never trust frontend**: Spin results are calculated server-side only
2. **Telegram verification**: All Telegram data is hash-verified on backend
3. **Rate limiting**: Spin endpoint has rate limiting to prevent abuse
4. **Session security**: Admin sessions expire after 24 hours
5. **Atomic updates**: Prize stock updates use database transactions

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

MIT