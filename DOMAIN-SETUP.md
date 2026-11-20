# Custom domain setup (GoDaddy → GitHub Pages)

The site works at its current address until you do this. About 15 minutes of work, then up to a few hours for DNS to spread.
Use **www.yourdomain.com** as the main address; the bare `yourdomain.com` will redirect to it.

## 1. Tell GitHub the domain
1. Open https://github.com/joshuarichard116-sudo/jrichard-web/settings/pages
2. Under **Custom domain**, type `www.yourdomain.com` and click **Save**.
   GitHub adds a small file named `CNAME` to the repo. Leave it there.

## 2. Add the DNS records in GoDaddy
GoDaddy → **My Products** → your domain → **DNS** → **Manage DNS**.

1. **Delete** GoDaddy's default `A` record for `@` that says **Parked**, and any **Forwarding** on the domain.
2. Add these records:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `www` | `joshuarichard116-sudo.github.io` | 1 hour |
| A | `@` | `185.199.108.153` | 1 hour |
| A | `@` | `185.199.109.153` | 1 hour |
| A | `@` | `185.199.110.153` | 1 hour |
| A | `@` | `185.199.111.153` | 1 hour |
| AAAA | `@` | `2606:50c0:8000::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8001::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8002::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8003::153` | 1 hour |

The AAAA rows are optional (they add IPv6), but recommended.

## 3. Turn on HTTPS
Back on the Pages settings page, wait until the domain check shows a green tick (can take up to a few hours), then tick **Enforce HTTPS**. GitHub issues the certificate for free.

## 4. Verify the domain (security step, recommended)
https://github.com/settings/pages → **Add a domain** → enter `yourdomain.com`. GitHub shows a **TXT** record; add it in GoDaddy DNS exactly as shown, then click **Verify**.
This stops anyone else from claiming your domain on GitHub Pages if your site is ever unpublished (a "subdomain takeover").

## 5. Check it
- `https://www.yourdomain.com` loads the site with a padlock.
- `https://yourdomain.com` redirects to `www`.
- The old `joshuarichard116-sudo.github.io/jrichard-web/` address redirects to the new domain automatically.

Optional check from a terminal:
```
nslookup www.yourdomain.com
```
It should show `joshuarichard116-sudo.github.io` and GitHub's addresses.

## 6. Last step: update the links
Tell Claude: **"switch the site to www.yourdomain.com"**. That updates the page's canonical link, link-preview tags, sitemap, robots file, structured data, and the links on your GitHub profile and resume.
The site's own internal links and the 404 page already work on either address.
