# PDP size-chart scraper (local, no OpenAI)

This CLI reads a CSV of retailer PDP links and writes a CSV row for each detected size-chart row. It uses the installed browser, stores source evidence beside every result, and does not attempt to bypass a retailer block or CAPTCHA. It can optionally use a standard authenticated proxy configured through local environment variables.

For the local Proxy-Seller setup, set `PROXY_SELLER_PROXY_SERVER`, `PROXY_SELLER_PROXY_USERNAME`, and `PROXY_SELLER_PROXY_PASSWORD` in the ignored `.env.local`. The Python runner reads only those variables. It does not use the account API key as a proxy credential.

## Input

At minimum, provide `product_id` and `pdp_url`. `merchant` and `category` are optional but recommended.

```csv
product_id,pdp_url,merchant,category
abc-123,https://retailer.example/products/dress-123,Example Retailer,dresses
bag-456,https://retailer.example/products/bag-456,Example Retailer,handbag
```

## Run

```bash
npx tsx scripts/size-chart-scraper/index.ts \
  --input /absolute/path/products.csv \
  --output /absolute/path/size-charts.csv \
  --evidence-dir /absolute/path/size-chart-evidence \
  --limit 20
```

The default 1.2-second delay is deliberate. Increase it for a larger retailer batch.

For a local smoke test, use `fixtures/products.csv`; relative PDP links in an input CSV resolve from that CSV's folder. Production input should use `https://` retailer PDP URLs.

On macOS the script automatically uses installed Google Chrome if the Puppeteer cache is unavailable. To choose a different Chrome/Chromium executable, set `SIZE_CHART_BROWSER_PATH` before running it.

## Output status

- `extracted`: visible HTML table found. Each size becomes one CSV row.
- `image_chart_needs_review`: a visual chart was captured; on macOS it is OCR'd with Apple Vision locally. OCR values are deliberately low-confidence and must be reviewed before import.
- `not_found`: no visible size-guide control/table found.
- `blocked_or_captcha`: the tool stops; it does not retry around retailer controls.
- `not_applicable`: handbags and jewelry are skipped rather than receiving an apparel chart.
- `failed`: navigation or page error; check `message` and evidence.

Every result saves `chart.png` and `manifest.json` under the evidence directory. Keep that evidence when importing a guide: it is how we distinguish a product-specific guide from a generic brand chart.
