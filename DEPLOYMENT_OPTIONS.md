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
| Production Bundle | **457 KB** total (136 KB gzipped) |
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
| **Paid Tier** | Pro $5/month (5,000 builds, 5 concurrent) |
| **CDN** | 300+ edge locations globally |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | Native — auto-serves `index.html` for all routes |
| **Commercial Use** | Allowed on free plan |

**Pros:**
- Unlimited bandwidth means zero concern about traffic spikes (game goes viral on Reddit? No problem)
- No credit card required
- Excellent Vite integration via `@cloudflare/vite-plugin`
- WebGL assets and custom fonts served from edge without bandwidth worries
- HTTP/3, automatic cache invalidation on deploy

**Cons:**
- 500 builds/month cap (plenty for a hobby project)
- 1 concurrent build on free tier
- Newer ecosystem than Netlify/Vercel

---

### 2. Vercel

| Feature | Details |
|---|---|
| **Free Bandwidth** | 100 GB/month |
| **Free Builds** | 6,000 minutes/month |
| **Paid Tier** | Pro $20/user/month (1 TB bandwidth) |
| **CDN** | Global edge network |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | Native via `vercel.json` rewrites |
| **Commercial Use** | **No** — Hobby plan is non-commercial only |

**Pros:**
- Best-in-class developer experience and dashboard
- Most generous build minutes (6,000/month)
- Instant rollbacks, preview deploys per PR
- Excellent React/Vite support

**Cons:**
- **Non-commercial restriction** on free tier — if you ever monetize (ads, donations), must upgrade to $20/month
- 100 GB bandwidth: at ~500 KB per visit, supports ~200K visits/month (adequate but not unlimited)
- Site becomes unavailable when limits hit (no surprise bills, but also no service)

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
- Site suspended if you exceed free limits
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
- 750 build minutes — more than Netlify
- Simple, predictable upgrade path

**Cons:**
- All free services suspended if bandwidth exceeded
- CDN coverage not as extensive as Cloudflare/Vercel
- Fewer features (no deploy previews on free tier)
- Less polished developer experience

---

### 5. GitHub Pages

| Feature | Details |
|---|---|
| **Free Bandwidth** | 100 GB/month (soft limit) |
| **Free Builds** | 10/hour (soft limit) |
| **Paid Tier** | GitHub Pro $4/month (private repo Pages) |
| **CDN** | Fastly-backed CDN |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | **No native support** — requires `404.html` hack |
| **Commercial Use** | No |

**Pros:**
- Completely free, no credit card needed
- Deeply integrated with GitHub repos
- Soft limits — GitHub emails you rather than suspending

**Cons:**
- **No SPA routing support** — `404.html` hack sends actual 404 HTTP status, breaks link previews and causes browser warnings
- No built-in build system — requires GitHub Actions setup
- 1 GB site size limit
- No deploy previews or branch deploys

---

### 6. AWS S3 + CloudFront

| Feature | Details |
|---|---|
| **Free Bandwidth** | **1 TB/month** (Always Free, never expires) |
| **Free Builds** | N/A (bring your own CI/CD) |
| **Paid Tier** | Pay-as-you-go ~$0.085/GB; Flat-rate Pro $15/month for 50 TB |
| **CDN** | 600+ edge locations (largest network) |
| **Custom Domain** | Yes, Route 53 at $0.50/month |
| **SPA Routing** | Configurable via CloudFront custom error responses |
| **Commercial Use** | Yes |

**Pros:**
- 1 TB/month free bandwidth — most generous allowance
- Enterprise-grade reliability with 600+ edge locations
- New flat-rate free plan (Nov 2025) bundles WAF + DDoS protection
- Real-world cost for low-traffic: $0–$1/month
- No commercial restrictions

**Cons:**
- **Significantly more complex to set up** (S3 bucket policies, CloudFront distributions, ACM certificates)
- No built-in CI/CD — must configure deployment pipelines
- Route 53 hosted zone adds $0.50/month fixed cost
- AWS console can be overwhelming

---

### 7. Firebase Hosting

| Feature | Details |
|---|---|
| **Free Bandwidth** | **10 GB/month** (Spark plan) |
| **Free Storage** | 1 GB |
| **Paid Tier** | Blaze (pay-as-you-go) $0.15/GB beyond free tier |
| **CDN** | Google's global CDN |
| **Custom Domain** | Free with automatic SSL |
| **SPA Routing** | Native via `firebase.json` rewrites |
| **Commercial Use** | Yes |

**Pros:**
- Simple CLI deployment (`firebase init` + `firebase deploy`)
- Native SPA routing support
- Easy integration with other Firebase/Google services

**Cons:**
- **Only 10 GB/month bandwidth** — far too low for a WebGL game with shaders and fonts
- Only 1 GB storage on free plan
- Overage rate of $0.15/GB is relatively expensive

---

## Side-by-Side Summary

| Platform | Free BW | Free Builds | Custom Domain | SPA Support | Commercial OK | Overage |
|---|---|---|---|---|---|---|
| **Cloudflare Pages** | **Unlimited** | 500/mo | Yes | Native | **Yes** | N/A |
| **AWS CloudFront** | **1 TB/mo** | BYO CI | Yes ($0.50/mo) | Config | **Yes** | Billed |
| **Vercel** | 100 GB/mo | 6,000 min | Yes | Native | No | Unavailable |
| **Netlify** | 100 GB/mo | 300 min | Yes | Native | **Yes** | Suspended |
| **Render** | 100 GB/mo | 750 min | Yes | Config | **Yes** | Suspended |
| **GitHub Pages** | 100 GB/mo | 10/hr | Yes | Hack only | No | Email |
| **Firebase** | 10 GB/mo | CLI | Yes | Native | **Yes** | Billed |

---

## Recommendation

### Top Pick: Cloudflare Pages

Cloudflare Pages is the clear winner for this project:

1. **Unlimited free bandwidth** — with a 457 KB bundle including WebGL shaders and custom fonts, you never need to worry about traffic surges or going viral
2. **Native SPA support** — works out of the box with Vite React apps, no configuration hacks needed
3. **300+ edge locations** — fast global delivery of WebGL assets
4. **Commercial use allowed** — no restrictions if you ever monetize the game
5. **No credit card required** — truly free to start
6. **500 builds/month** — roughly 16 deploys/day, more than enough for hobby development
7. **Simple setup** — connect GitHub repo, set build command (`npm run build`), set output directory (`dist`), done

### Runner-Up: AWS S3 + CloudFront

Best raw infrastructure with 1 TB/month free bandwidth and 600+ edge locations. Choose this if you're already comfortable with AWS and don't mind the setup complexity. Real-world cost: $0–$1/month for a low-traffic game.

### Honorable Mention: Vercel

Best developer experience with the most generous build minutes. However, the **non-commercial restriction** on the Hobby plan is a meaningful limitation. If you're certain this will remain a non-commercial hobby project, Vercel is excellent.

### Not Recommended

- **Firebase Hosting** — 10 GB/month bandwidth is inadequate for a WebGL game
- **GitHub Pages** — no native SPA routing support; `404.html` hack causes real problems

---

## Quick Start: Deploying to Cloudflare Pages

1. Push code to GitHub
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → Create a project
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 20+ (set via environment variable `NODE_VERSION=20`)
5. Deploy — Cloudflare handles the rest (SSL, CDN, cache invalidation)

All subsequent pushes to `main` will auto-deploy. Branch pushes create preview deployments.

---

## Sources

- [Cloudflare Pages Pricing & Limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Vercel Pricing](https://vercel.com/pricing)
- [Netlify Pricing](https://www.netlify.com/pricing/)
- [Render Free Tier](https://www.freetiers.com/directory/render)
- [GitHub Pages Limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Amazon CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/)
- [AWS Flat-Rate Pricing (Nov 2025)](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-flat-rate-pricing-plans/)
- [Firebase Hosting Quotas & Pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
