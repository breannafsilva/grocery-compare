# CI/CD Deployment

This app deploys from Azure DevOps Pipelines to Cloudflare Workers.

## Target

- Azure DevOps organization: `https://dev.azure.com/Vizientinc`
- Azure DevOps project: `ClinicalPracticeSolutionsCenter`
- Source repository: GitHub `breannafsilva/grocery-compare`
- Branch: `main`
- Cloudflare account ID: `b158f2363ed6a1bec5ff4ff2d79088fc`
- Cloudflare Worker name: `compare-grocer`
- Default ZIP code: `60647`

## Azure Pipeline

The pipeline is defined in `azure-pipelines.yml` and runs on pushes to `main`.

It performs:

1. Checkout
2. Node.js 22 setup
3. `npm ci`
4. `npm run lint`
5. `npm run build`
6. `npx wrangler deploy --config dist/server/wrangler.json --name compare-grocer`

## Cloudflare API Token

Create a Cloudflare API token with the narrowest permissions practical for this
Worker:

- Account: Cloudflare Workers Scripts: Edit
- Account: Account Settings: Read
- Include: account `b158f2363ed6a1bec5ff4ff2d79088fc`

If Cloudflare prompts for additional permission during the first deploy, add only
the specific permission Wrangler reports.

## Store The Token In Azure DevOps

1. Open `https://dev.azure.com/Vizientinc`.
2. Open project `compare-grocer`.
3. Go to **Pipelines**.
4. Create or open the pipeline that uses `azure-pipelines.yml`.
5. Select **Edit**.
6. Select **Variables**.
7. Add variable `CLOUDFLARE_API_TOKEN`.
8. Paste the Cloudflare API token as the value.
9. Check **Keep this value secret**.
10. Save the variable.
11. Run the pipeline from `main`.

Azure secret variables are masked in logs, but do not echo them in scripts.

## Runtime Secrets

Kroger live pricing is optional and not configured yet. When credentials are
available, add these as Cloudflare Worker secrets rather than committing them:

- `KROGER_CLIENT_ID`
- `KROGER_CLIENT_SECRET`
- `KROGER_LOCATION_ID`
- `KROGER_SCOPE`

Use Wrangler locally or in a controlled one-time pipeline step to write Worker
secrets.

## Public vs Private

Public means the deployed `*.workers.dev` URL is reachable by anyone who has the
URL. The app code is already client-visible, but provider credentials stay
server-side as Worker secrets.

Private means visitors must authenticate before the app loads. For Cloudflare,
that usually means putting Cloudflare Access in front of the Worker and allowing
only approved users or your organization domain. This is better for internal
tools, but it adds identity setup and policy ownership.

Recommended starting point: deploy public only if the app contains no user data,
no internal data, and the live-pricing API is rate-limited or low-risk. Use
private access if this will become an internal Vizient tool or if API quota abuse
would matter.
