# ハチカイ Deployment Checklist

## Vercel Deployment Status
- ✅ Code pushed to GitHub (main branch)
- ✅ Vercel configuration files created
- ⏳ Awaiting Vercel project connection and environment variable configuration

## Required Environment Variables in Vercel

### For Web Application (apps/web)
1. **Supabase Configuration**
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `NEXT_PUBLIC_API_URL`: API endpoint URL (after API deployment)

2. **Google OAuth**
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

### For API Application (apps/api)
1. **Database Configuration**
   - `DATABASE_URL`: postgresql://postgres.pzuqtdvqgiyxmhldsdpu:04050405Aoi-@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?connection_limit=1&connect_timeout=10
   - `DIRECT_URL`: postgresql://postgres.pzuqtdvqgiyxmhldsdpu:04050405Aoi-@aws-1-ap-northeast-1.db.supabase.co:5432/postgres

2. **Security**
   - `SUPABASE_JWT_SECRET`: Your Supabase JWT secret (from project settings)
   - `ADMIN_TOKEN`: devadmin (change in production)
   - `ADS_TOKEN_SECRET`: devadsecret (change in production)

3. **Server Configuration**
   - `PORT`: 3001
   - `TIMEZONE`: Asia/Tokyo
   - `MIN_AD_DURATION_SEC`: 10

## Deployment Steps

### 1. Connect GitHub Repository to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import `jinjinsansan/hatikai` repository
4. Select "Turborepo" as framework preset

### 2. Configure Environment Variables
1. In Vercel project settings, go to "Environment Variables"
2. Add all variables listed above for both Production and Preview environments
3. Make sure to get the correct values from:
   - Supabase Dashboard → Settings → API
   - Google Cloud Console → APIs & Services → Credentials

### 3. Deploy API Separately (Optional but Recommended)
Since this is a monorepo with both frontend and backend:

#### Option A: Single Deployment (Simpler)
- Deploy entire monorepo to one Vercel project
- API will run as serverless functions

#### Option B: Separate Deployments (Better for scaling)
1. Create separate Vercel project for API
2. Set root directory to `apps/api`
3. Configure build command: `pnpm build`
4. Set output directory to `dist`

### 4. Post-Deployment Verification

#### Check Frontend
- [ ] Login page loads
- [ ] Google OAuth works
- [ ] Can access dashboard after login
- [ ] Tier display shows correctly

#### Check API
- [ ] Health check endpoint responds: `GET /api/health`
- [ ] Auth endpoints work: `POST /api/auth/google`
- [ ] Tier endpoints respond: `GET /api/tiers`

#### Database Connection
- [ ] Check Vercel Functions logs for database connection status
- [ ] Note: Server is configured to run without database (mock mode) if connection fails

## Current Implementation Status

### ✅ Completed (Phase 1-4)
1. **Phase 1: Database & Core Models**
   - User, Tier, Obligation models
   - Tier system (8 levels)
   - Daily roulette mechanics

2. **Phase 2: Roulette System**
   - Initial tier assignment
   - Daily tier changes
   - Probability calculations with modifiers

3. **Phase 3: Obligation Management**
   - Purchase requirements by tier
   - Ad viewing requirements
   - Completion tracking

4. **Phase 4: Scheduling System**
   - Daily tasks (0:00 JST)
   - Weekly summaries
   - Monthly statistics
   - Special events (革命、下克上)

### ⏳ Pending (Phase 5-6)
5. **Phase 5: External Integrations**
   - Amazon Product API
   - Payment processing
   - Ad network integration

6. **Phase 6: Production Optimization**
   - Performance tuning
   - Security hardening
   - Monitoring setup

## Known Issues
1. **Database Connection**: Currently using lazy connection mode due to Supabase timeout issues
   - Server starts in mock mode without database
   - Will connect on first query attempt
   - Monitor logs for connection status

2. **Scheduler**: Runs every 30 seconds checking for midnight JST
   - May need adjustment for production
   - Consider using Vercel Cron Jobs instead

## Support Resources
- [Vercel Turborepo Guide](https://vercel.com/docs/monorepos/turborepo)
- [Supabase Vercel Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [NestJS on Vercel](https://vercel.com/guides/using-express-with-vercel)

## Contact for Issues
- Repository: https://github.com/jinjinsansan/hatikai
- Check Vercel deployment logs for errors
- Review Supabase connection settings if database issues persist