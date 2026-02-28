# Deployment Options Report — New Eleusis

**Date:** 2026-02-28
**Project:** New Eleusis (Vite React SPA with WebGL shaders)

---

## Project Characteristics

| Property | Value |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7.3 |
| Output Type | **Static SPA** (no backend, no database) |
| Production Bundle | **459 KB** total (136 KB gzipped) |
| Special Assets | WebGL shaders (OGL), custom fonts (Press Start 2P), CSS animations |
| Backend Requirements | None — all game logic runs client-side |
| Build Command | `tsc -b && vite build` |
| Build Time | ~6 seconds |

The fully static nature of this project means it can be deployed on **any static hosting platform** with zero server infrastructure.

---

## Platform Comparison

### 1. Cloudflare Pages

| Feature | Details |
|---|---|
| **Free Bandwidth** | **Unlimited** (no cap) |
| **Free Builds** | 500 builds/month, 1 concurrent |
| **Paid Tier** | Workers Paid $5/month (5,000 builds, 5 concurrent) |
| **CDN** | 330+ edge locations globally |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | Native — auto-serves `index.html` for all routes |
| **Commercial Use** | Allowed on free plan |

**Pros:**
- Unlimited bandwidth and requests — zero concern about traffic spikes
- No credit card required
- Largest edge network of any free option (330+ PoPs)
- HTTP/3, Brotli compression, automatic cache invalidation on deploy
- Git integration (GitHub/GitLab) with preview deployments per branch
- Free Web Analytics and DDoS protection included
- Commercial use explicitly allowed

**Cons:**
- 500 builds/month cap (plenty for a hobby project — ~16/day)
- 1 concurrent build on free tier (additional builds queue)
- Newer ecosystem, slightly less community tooling than Vercel/Netlify

---

### 2. Vercel

| Feature | Details |
|---|---|
| **Free Bandwidth** | 100 GB/month |
| **Free Builds** | 6,000 minutes/month |
| **Paid Tier** | Pro $20/user/month (1 TB bandwidth) |
| **CDN** | 126 PoPs, 94 cities, 51 countries (anycast routing) |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | Native via `vercel.json` rewrites |
| **Commercial Use** | **No** — Hobby plan is non-commercial only |

**Pros:**
- Best-in-class developer experience and dashboard
- Most generous build minutes (6,000/month)
- Instant rollbacks, preview deploys per PR
- Excellent React/Vite support
- Hard limits — no surprise bills (site stops serving when limits hit)

**Cons:**
- **Non-commercial restriction** on free tier — monetization (ads, donations) requires $20/month upgrade
- 100 GB bandwidth: at ~136 KB gzipped per visit, supports ~735K visits/month (adequate but not unlimited)
- Single-user only; no team collaboration on free tier
- Expensive jump to paid ($20/user/month)

---

### 3. Netlify

| Feature | Details |
|---|---|
| **Free Bandwidth** | 100 GB/month |
| **Free Builds** | 300 minutes/month (legacy); credit-based for new accounts |
| **Paid Tier** | Pro $19/member/month (1 TB bandwidth) |
| **CDN** | Global CDN |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | Native via `_redirects` file (`/* /index.html 200`) |
| **Commercial Use** | Allowed on free plan |

**Pros:**
- Mature platform with excellent documentation
- Simple SPA configuration via `_redirects` file
- Deploy previews for every PR
- Built-in form handling, identity features

**Cons:**
- Lowest build minutes (300/month on legacy plan)
- New accounts (post-Sept 2025) use credit-based pricing — harder to predict costs
- Site suspended if you exceed free limits (until next billing cycle)
- Pro plan overages can be expensive ($55 per 100 GB over limit)

---

### 4. Render

| Feature | Details |
|---|---|
| **Free Bandwidth** | 100 GB/month |
| **Free Builds** | 750 minutes/month |
| **Paid Tier** | Starter $7/month |
| **CDN** | Included but fewer edge locations |
| **Custom Domain** | Free with SSL |
| **SPA Routing** | Configurable via rewrite rules |
| **Commercial Use** | Allowed |

**Pros:**
- Static sites permanently free (not time-limited)
- 750 build minutes — more generous than Netlify
- Cheapest paid upgrade path ($7/month)
- Good option if you anticipate adding a backend later (Render hosts full-stack apps)

**Cons:**
- All free services suspended if bandwidth exceeded
- CDN coverage not as extensive as Cloudflare/Vercel
- Fewer static-site-specific features (no deploy previews on free tier)
- Bandwidth overages reportedly expensive

---

### 5. GitHub Pages

| Feature | Details |
|---|---|
| **Free Bandwidth** | 100 GB/month (soft limit) |
| **Free Builds** | 10/hour (soft limit) |
| **Paid Tier** | GitHub Pro $4/month (private repo Pages) |
| **CDN** | Fastly-backed CDN |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | **No native support** — requires `404.html` workaround |
| **Commercial Use** | No |

**Pros:**
- Completely free, zero configuration beyond GitHub
- Soft limits — GitHub emails you rather than suspending
- Fastly-backed CDN is fast

**Cons:**
- **No SPA routing support** — `404.html` hack sends actual 404 HTTP status codes
- No built-in build system — requires GitHub Actions setup
- 1 GB site size limit
- No deploy previews or branch deploys
- Repository must be public on free tier

---

### 6. AWS S3 + CloudFront

| Feature | Details |
|---|---|
| **Free Bandwidth** | 1 TB/month (Always Free tier) |
| **Free Builds** | N/A (bring your own CI/CD) |
| **Paid Tier** | Pay-as-you-go ~$0.085/GB; flat-rate plans available |
| **CDN** | 600+ edge locations (largest network) |
| **Custom Domain** | Yes, Route 53 at $0.50/month + domain cost |
| **SPA Routing** | Configurable via CloudFront custom error responses |
| **Commercial Use** | Yes |

**Pros:**
- Most scalable option — handles any traffic level
- Largest CDN with 600+ PoPs globally
- Always Free tier includes generous bandwidth allowance
- Real-world cost for low-traffic static sites: $0.50–$1/month
- Full control over caching, headers, security policies

**Cons:**
- **Significantly more complex to set up** (S3 bucket, CloudFront distribution, ACM certificates, IAM policies)
- No built-in CI/CD — must configure GitHub Actions or similar
- Route 53 hosted zone adds $0.50/month fixed cost
- No deploy previews; no git integration
- Overkill for a hobby project

---

### 7. Firebase Hosting

| Feature | Details |
|---|---|
| **Free Bandwidth** | **10 GB/month** (Spark plan) |
| **Free Storage** | 1 GB |
| **Paid Tier** | Blaze (pay-as-you-go) ~$0.15/GB beyond free tier |
| **CDN** | Google's global CDN |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | Native via `firebase.json` rewrites |
| **Commercial Use** | Yes |

**Pros:**
- Simple CLI deployment (`firebase init` + `firebase deploy`)
- Native SPA routing support
- Easy integration with other Firebase/Google services if needed later

**Cons:**
- **Only 10 GB/month bandwidth** — with a ~136 KB gzipped bundle, that's only ~73,000 page loads before hitting the cap
- Only 1 GB storage on free plan
- Overage rate of $0.15/GB is relatively expensive
- More complex setup than Cloudflare/Vercel/Netlify

---

## Side-by-Side Summary

| Platform | Free BW | Free Builds | Custom Domain | SPA Support | Commercial OK | On Limit Exceed |
|---|---|---|---|---|---|---|
| **Cloudflare Pages** | **Unlimited** | 500/mo | Yes | Native | **Yes** | N/A |
| **AWS CloudFront** | **1 TB/mo** | BYO CI | Yes ($0.50/mo) | Config | **Yes** | Billed |
| **Vercel** | 100 GB/mo | 6,000 min | Yes | Native | No | Unavailable |
| **Netlify** | 100 GB/mo | 300 min | Yes | Native | **Yes** | Suspended |
| **Render** | 100 GB/mo | 750 min | Yes | Config | **Yes** | Suspended |
| **GitHub Pages** | 100 GB/mo | 10/hr | Yes | Hack only | No | Email |
| **Firebase** | 10 GB/mo | CLI | Yes | Native | **Yes** | Billed |

---

## Cost Projection

Based on the 459 KB bundle (136 KB gzipped), estimated monthly costs at different traffic levels:

| Traffic Level | Visits/mo | Transfer/mo | Cloudflare | Vercel | Netlify | AWS |
|---|---|---|---|---|---|---|
| **Low** (hobby) | 1,000 | ~136 MB | **$0** | $0 | $0 | ~$0.50 |
| **Moderate** | 50,000 | ~6.6 GB | **$0** | $0 | $0 | ~$0.50 |
| **Growing** | 500,000 | ~66 GB | **$0** | $0 | $0 | ~$0.50 |
| **Viral spike** | 2,000,000 | ~265 GB | **$0** | **$20/mo** (Pro) | **$19/mo** (Pro) | ~$1 |

---

## Recommendation

### Top Pick: Cloudflare Pages (Free)

Cloudflare Pages is the clear winner for this project:

1. **Unlimited free bandwidth** — with a 459 KB bundle including WebGL shaders and custom fonts, traffic is never a concern
2. **Native SPA support** — works out of the box with Vite React apps
3. **330+ edge locations** — fast global delivery
4. **Commercial use allowed** — no restrictions if you ever monetize the game
5. **No credit card required** — truly free to start
6. **500 builds/month** — more than enough for active hobby development
7. **Simple setup** — connect GitHub repo, set build command, set output directory, done

### Runner-Up: Vercel (Free)

Best developer experience with generous build minutes and excellent React/Vite tooling. The 100 GB bandwidth is plenty for most hobby projects (~735K visits/month). Choose this if you value DX and are certain the project remains non-commercial. The expensive jump to Pro ($20/month) is the main drawback.

### Budget Upgrade Paths

If the project grows beyond free tier limits:

| Platform | First Paid Tier | What You Get |
|---|---|---|
| Cloudflare | $5/month | 5,000 builds, 5 concurrent, still unlimited BW |
| Render | $7/month | 512 MB web service + static |
| Netlify | $19/month | 1 TB BW, 25K build min |
| Vercel | $20/month | 1 TB BW, 10M edge requests |

### Not Recommended for This Project

- **Firebase Hosting** — 10 GB/month bandwidth is inadequate for a game with WebGL assets
- **GitHub Pages** — no native SPA routing; `404.html` workaround causes real HTTP 404 status codes

---

## Quick Start: Deploying to Cloudflare Pages

1. Push code to GitHub
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** Set environment variable `NODE_VERSION=20`
5. Deploy — Cloudflare handles SSL, CDN, and cache invalidation automatically

All subsequent pushes to `main` auto-deploy to production. Branch pushes and PRs create preview URLs automatically.

Optional: Add a custom domain in the Pages dashboard (free, with automatic SSL).

---

## Sources

- [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers & Pages Pricing](https://www.cloudflare.com/plans/developer-platform/)
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)
- [Netlify Pricing](https://www.netlify.com/pricing/)
- [Netlify Credit-Based Plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Render Pricing](https://render.com/pricing)
- [GitHub Pages Limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Amazon CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [Firebase Hosting Quotas & Pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
