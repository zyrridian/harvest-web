# Harvest Backend API

REST API for the Harvest Mobile App - connecting farmers with consumers.

## Getting Started

### Development Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
# Copy .env.example to .env and fill in your values
DATABASE_URL="your_database_url"
DIRECT_URL="your_direct_database_url"
JWT_SECRET="your_secret_key"
NODE_ENV="development"
```

3. Run database migrations:

```bash
npx prisma db push
# or for versioned migrations:
npx prisma migrate dev --name your_migration_name
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000/docs](http://localhost:3000/docs) to view the Swagger API documentation.

## Database Migrations

### When You Change the Database Schema

**Important:** After modifying `prisma/schema.prisma`, you must apply the changes:

#### For Development:

```bash
npx prisma db push
```

This syncs your database with the schema without creating migration files.

#### For Production (Recommended):

```bash
npx prisma migrate dev --name describe_your_change
```

This creates a migration file and applies it. Commit the migration file to git.

### After Pulling Changes

If someone else changed the schema:

```bash
npx prisma db push
# or
npx prisma migrate deploy
```

## Deployment

### Vercel Auto-Deployment

**Yes, your code auto-updates when you push to GitHub!**

The project is connected to Vercel and will automatically deploy when you:

1. Push commits to the `main` branch
2. Vercel detects the changes
3. Builds and deploys automatically

You can view deployment status at: [Vercel Dashboard](https://vercel.com/dashboard)

### Manual Deployment Steps

If you need to manually trigger deployment:

1. Commit your changes:

```bash
git add .
git commit -m "your message"
git push origin main
```

2. Vercel will automatically:
   - Pull the latest code
   - Run `npm run build`
   - Deploy to production

### Environment Variables in Vercel

Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

## API Documentation

- **Production:** [https://harvest-backend-ugjh.vercel.app/docs](https://harvest-backend-ugjh.vercel.app/docs)
- **Local:** [http://localhost:3000/docs](http://localhost:3000/docs)

## Important Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Apply database changes (development)
npx prisma db push

# Create migration (production recommended)
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client
npx prisma generate
```

## Project Structure

```
app/
├── api/v1/          # API endpoints
├── admin/           # Admin panel UI
├── docs/            # Swagger documentation
├── lib/             # Utilities (auth, prisma, swagger)
└── generated/       # Generated Prisma Client

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Migration history
```

## Quick Reference

### After Changing Database Schema:

1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (or `npx prisma migrate dev --name change_name`)
3. Commit and push to GitHub
4. Vercel auto-deploys (no manual action needed!)

### Creating Admin User:

```sql
UPDATE "User" SET "userType" = 'ADMIN' WHERE email = 'your@email.com';
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)

## Harvest Schedule & Preorders

The Harvest Schedule system allows users to reserve upcoming harvests. It is decoupled from the standard marketplace cart to support its unique payment flow:
- **Deposit Policy:** Preorders require a 20% deposit. The remaining balance is paid on delivery/pickup.
- **Cancellation Policy:** Users can cancel a preorder for a full refund up to 7 days before the harvest date.

### Cron Job Setup for VPS (Ubuntu / Digital Ocean)

To automatically cancel reservations that have been unpaid for over 24 hours, you should set up a cron job on your VPS to periodically hit the cron endpoint.

1. SSH into your VPS:
```bash
ssh root@your_droplet_ip
```

2. Open the crontab editor:
```bash
crontab -e
```

3. Add the following line to run the job every hour (adjust the URL to your actual production domain):
```bash
0 * * * * curl -X POST https://your-domain.com/api/v1/cron/cancel-unpaid-preorders
```

*(Optional: If you add an authorization header check in the route later, include it in the curl command: `curl -H "Authorization: Bearer YOUR_SECRET" -X POST ...`)*
