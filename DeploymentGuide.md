# StrengthQuest - Deployment & Auth Setup Guide

**Goal:** Get from nothing to a live app with working authentication by end of Week 1 (Feb 9)

**What you'll have by the end:** A live URL where users can sign up, log in, and see a "Coming Soon" dashboard.

---

## Tech Stack Decision (Make This Today)

**Recommended Stack:**
- **Frontend:** Next.js 14 (App Router)
- **Backend/Database:** Supabase (PostgreSQL + built-in auth)
- **Deployment:** Vercel
- **Styling:** Tailwind CSS

**Why this stack:**
- Supabase handles auth for you (no custom auth logic)
- Vercel deploys Next.js apps in ~2 minutes
- Everything has great free tiers
- Massive community support (easy to find help)

**Alternative if you want simpler:** Use Convex instead of Supabase (even easier setup, but less flexible later)

---

## Phase 1: Local Setup (Day 1 - Monday)

### Step 1: Set Up Next.js Project

**If starting fresh (recommended):**

```bash
# Create new Next.js app
npx create-next-app@latest strengthquest

# When prompted, choose:
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - src/ directory: No
# - App Router: Yes
# - Turbopack: No
# - Import alias: No (or default @/*)

cd strengthquest
```

**If porting from V0:**
- Export your V0 code
- Copy the components into a new Next.js project
- Don't waste time fixing everything - just get the structure

### Step 2: Install Supabase Client

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Step 3: Test Local Development

```bash
npm run dev
```

Visit `http://localhost:3000` - you should see the Next.js welcome page.

**Success Checkpoint:** Local dev server running ✓

---

## Phase 2: Supabase Setup (Day 1 - Monday Evening)

### Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Sign up (free tier is generous)
3. Create new project:
   - Name: `strengthquest` (or similar)
   - Database password: SAVE THIS (use password manager)
   - Region: Choose closest to you

**Wait ~2 minutes** for database to provision.

### Step 2: Get Your Supabase Credentials

In Supabase dashboard:
1. Go to Project Settings (gear icon)
2. Click "API"
3. Copy these values:
   - **Project URL** (starts with https://xxx.supabase.co)
   - **Anon/Public Key** (long string starting with eyJ...)

### Step 3: Add Environment Variables

Create `.env.local` in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**IMPORTANT:** Add `.env.local` to `.gitignore` (should already be there)

**Success Checkpoint:** Supabase project created, credentials saved ✓

---

## Phase 3: Implement Auth (Day 2 - Tuesday)

### Step 1: Create Supabase Client

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### Step 2: Create Auth Pages

Create `app/login/page.tsx`:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for confirmation link!')
    }
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          StrengthQuest
        </h1>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600"
          />

          {message && (
            <p className="text-sm text-yellow-400">{message}</p>
          )}

          <div className="space-y-2">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Log In'}
            </button>

            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Step 3: Create Protected Dashboard

Create `app/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to StrengthQuest!
        </h1>
        <p className="text-gray-400 mb-4">
          Logged in as: {user.email}
        </p>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-2">
            Coming Soon
          </h2>
          <p className="text-gray-400">
            Character creation and workout logging will be here next week!
          </p>
        </div>

        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
```

### Step 4: Add Sign Out Route

Create `app/auth/signout/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function POST(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

### Step 5: Update Homepage

Create `app/page.tsx`:

```typescript
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">
          StrengthQuest
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          RPG Progression for Lifters
        </p>
        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
        >
          Get Started
        </Link>
      </div>
    </div>
  )
}
```

### Step 6: Test Locally

```bash
npm run dev
```

1. Visit `http://localhost:3000`
2. Click "Get Started"
3. Sign up with your email
4. Check email for confirmation (click link)
5. Log in
6. You should see the dashboard!

**Success Checkpoint:** Auth working locally ✓

---

## Phase 4: Deploy to Vercel (Day 3 - Wednesday)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - auth working"

# Create repo on GitHub (github.com/new)
# Then:
git remote add origin https://github.com/yourusername/strengthquest.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up / Log in (use GitHub account for easy connection)
3. Click "New Project"
4. Import your GitHub repo
5. Vercel will auto-detect Next.js settings
6. **BEFORE DEPLOYING:** Add Environment Variables:
   - Click "Environment Variables"
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (Copy from your `.env.local`)
7. Click "Deploy"

**Wait ~2 minutes** for deployment.

### Step 3: Test Production

1. Vercel will give you a URL (like `strengthquest.vercel.app`)
2. Visit the URL
3. Sign up with a different email
4. Confirm email
5. Log in
6. You should see the dashboard!

**Success Checkpoint:** Live app with working auth ✓

---

## Phase 5: Configure Supabase for Production (Day 3 - Wednesday)

### Add Vercel URL to Supabase

In Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Add your Vercel URL to "Site URL": `https://your-app.vercel.app`
3. Add to "Redirect URLs": `https://your-app.vercel.app/**`

This allows email confirmations to redirect properly.

---

## Week 1 Complete! 🎉

**What you have:**
- ✅ Live production URL
- ✅ User signup working
- ✅ Email confirmation working
- ✅ Login working
- ✅ Protected dashboard route
- ✅ Sign out working
- ✅ Deployment pipeline proven

**What's next (Week 2):**
- Add database tables for characters, skills, workouts
- Create character creation form
- Deploy changes automatically (Vercel auto-deploys on push to main)

---

## Troubleshooting

### "Environment variables not defined"
- Make sure you added them in Vercel dashboard
- Redeploy after adding environment variables

### Email confirmation not working locally
- Check Supabase dashboard → Authentication → Email Templates
- For local dev, you can disable email confirmation temporarily:
  - Go to Authentication → Providers → Email
  - Disable "Confirm email"
  - **Re-enable for production!**

### "Could not establish connection"
- Double-check your Supabase URL and key in `.env.local`
- Make sure Supabase project is running (not paused)

### Vercel deployment failed
- Check build logs in Vercel dashboard
- Common issue: TypeScript errors - fix them locally first
- Make sure all dependencies are in `package.json`

### Can't sign in after signing up
- Check your email for confirmation link
- Check spam folder
- Make sure you clicked the confirmation link before trying to log in

---

## Database Schema (For Week 2)

You'll create these tables in Supabase SQL Editor:

```sql
-- Week 2: Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Characters table
create table public.characters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  class text not null,
  bodyweight numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Skills table
create table public.skills (
  id uuid default uuid_generate_v4() primary key,
  character_id uuid references public.characters not null,
  skill_type text not null, -- 'push', 'pull', 'legs'
  level integer default 1,
  current_xp integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workouts table (add in Week 3)
create table public.workouts (
  id uuid default uuid_generate_v4() primary key,
  character_id uuid references public.characters not null,
  skill_type text not null,
  workout_date date not null,
  intensity integer not null,
  length_minutes integer not null,
  xp_gained integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exercises table (add in Week 3)
create table public.exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references public.workouts not null,
  exercise_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sets table (add in Week 3)
create table public.sets (
  id uuid default uuid_generate_v4() primary key,
  exercise_id uuid references public.exercises not null,
  set_number integer not null,
  weight numeric not null,
  reps integer not null,
  rpe integer, -- optional
  calculated_1rm numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PRs table (add in Week 4)
create table public.personal_records (
  id uuid default uuid_generate_v4() primary key,
  character_id uuid references public.characters not null,
  exercise_name text not null,
  weight numeric not null,
  reps integer not null,
  calculated_1rm numeric not null,
  achieved_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.characters enable row level security;
alter table public.skills enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.sets enable row level security;
alter table public.personal_records enable row level security;

-- RLS Policies (users can only access their own data)
create policy "Users can view own character"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "Users can insert own character"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "Users can update own character"
  on public.characters for update
  using (auth.uid() = user_id);

-- Add similar policies for other tables...
```

**Don't run this yet!** This is for Week 2 when you're ready to add database tables.

---

## Daily Deployment Workflow (Starting Week 2)

Once your deployment pipeline is set up, your daily workflow is:

```bash
# Make changes locally
# Test locally: npm run dev

# When ready to deploy:
git add .
git commit -m "Add character creation"
git push

# Vercel automatically deploys!
# Check your live URL in ~2 minutes
```

**That's it.** Vercel handles everything automatically.

---

## Cost Breakdown (Free Tiers)

**Supabase Free Tier:**
- 500MB database
- 50,000 monthly active users
- 2GB file storage
- Unlimited API requests

**Vercel Free Tier:**
- 100GB bandwidth/month
- Unlimited deployments
- Automatic SSL
- Custom domains (you need to buy domain separately)

**Total cost for MVP: $0** (unless you buy a custom domain for ~$12/year)

---

## Next Steps

**End of Week 1 Goal:**
- [ ] Supabase project created
- [ ] Local auth working (can sign up, log in, log out)
- [ ] Deployed to Vercel with live URL
- [ ] Test account created on production

**Start of Week 2:**
- Add database tables (use SQL above)
- Build character creation form
- Save character to database
- Deploy and test

**You're on track for April 4 launch!**

---

## Quick Reference Commands

```bash
# Start local dev server
npm run dev

# Deploy to production (auto-deploys via Vercel)
git push

# Check Vercel deployment status
# Visit vercel.com/dashboard

# View Supabase logs
# Visit supabase.com → your project → Logs

# Run SQL in Supabase
# Visit supabase.com → your project → SQL Editor
```

---

## Emergency Contacts / Resources

**Supabase Docs:**
- Auth: https://supabase.com/docs/guides/auth
- Database: https://supabase.com/docs/guides/database

**Vercel Docs:**
- Deployment: https://vercel.com/docs
- Environment Variables: https://vercel.com/docs/environment-variables

**Next.js Docs:**
- App Router: https://nextjs.org/docs/app
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

**If you get stuck:**
1. Check the troubleshooting section above
2. Search Supabase Discord (invite link on their site)
3. Check Next.js GitHub discussions

---

**Current Deadline: Sunday Feb 9 - Live URL with working auth**

Let's ship it! 🚀
