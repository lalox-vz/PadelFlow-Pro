# Deployment Guide for Olimpo

To deploy your application to Vercel, follow these steps.

## 1. Prerequisites

Ensure you have the following:
- A [Vercel](https://vercel.com) account.
- A [GitHub](https://github.com) account.
- Your Supabase project URL and Anon Key.

## 2. Push Code to GitHub

If you haven't initialized a repository yet:

1.  Initialize git:
    ```bash
    git init
    ```
2.  Add all files:
    ```bash
    git add .
    ```
3.  Commit changes:
    ```bash
    git commit -m "Ready for deploy"
    ```
4.  Create a new repository on GitHub.
5.  Link your local repository to GitHub (replace URL with yours):
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/olimpo-gym.git
    git branch -M main
    git push -u origin main
    ```

## 3. Deploy to Vercel

1.  Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your `olimpo-gym` repository from GitHub.
4.  **Configuration**:
    *   **Framework Preset**: Next.js (should be auto-detected).
    *   **Root Directory**: `./` (default).
    *   **Environment Variables**: You MUST add these variables from your `.env.local` file:
        *   `NEXT_PUBLIC_SUPABASE_URL`
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5.  Click **"Deploy"**.

## 4. Post-Deployment Checks

1.  **Supabase Auth Redirects**:
    *   Go to your [Supabase Dashboard](https://supabase.com/dashboard).
    *   Navigate to **Authentication** -> **URL Configuration**.
    *   Add your new Vercel domain (e.g., `https://olimpo-gym.vercel.app`) to the **Site URL** and **Redirect URLs**.
    *   If this is not done, users won't be able to log in or sign up.

2.  **Database Functions**:
    *   Ensure you have run all the recent SQL migration scripts (`fix_fk_deletion.sql`, `fix_notification_policies.sql`, `update_role_func.sql`, etc.) in the Supabase SQL Editor.

## 5. Troubleshooting

*   **Build Errors**: If the build fails on Vercel, check the logs. Since `npm run build` passed locally, it should work.
*   **Redirects**: If clicking "Login" takes you to `localhost`, check the `NEXT_PUBLIC_SITE_URL` or Supabase Redirect URLs.
