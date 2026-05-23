# Droplet Env Checklist

Local note only. Do not paste real secret values into this file.

## Goal

Keep Google Analytics enabled while preventing PrimeStyle/server keys from being exposed in browser source, page source, or client bundles.

## Frontend env

Set this on the live frontend droplet or frontend deploy environment:

```bash
NEXT_PUBLIC_GA_ID=G-PEJTT3E11V
```

Keep the frontend API origin configured as usual:

```bash
NEXT_PUBLIC_API_URL=https://api.primestyleai.com
```

Do not set these in the frontend env:

```bash
NEXT_PUBLIC_PRIMESTYLE_API_KEY=
PRIMESTYLE_FIRST_PARTY_API_KEY=
PRIMESTYLE_API_KEY=
```

Important: every `NEXT_PUBLIC_*` value is visible in the browser by design. That is okay for Google Analytics ID and public API URLs, but never okay for private API keys.

## Backend env

If the first-party PrimeStyle flow needs a server-side key, keep it only in the backend droplet env:

```bash
PRIMESTYLE_FIRST_PARTY_API_KEY=<real backend-only key>
```

Never expose this value through:

- `NEXT_PUBLIC_*`
- frontend `.env`
- React props
- SDK props
- browser request query params
- docs examples with real values

## Deployment reminder

When deploying these local changes later:

1. Update the live frontend env with `NEXT_PUBLIC_GA_ID=G-PEJTT3E11V`.
2. Confirm the live frontend env does not contain `NEXT_PUBLIC_PRIMESTYLE_API_KEY`.
3. Confirm the backend env contains server-only keys only on the backend service.
4. Rebuild/restart the frontend after env changes.
5. Restart the backend only if backend env changed.
6. After deploy, scan browser output for real keys:

```bash
curl -sL https://primestyleai.com | grep -E "ps_live_|sk_live_|PRIMESTYLE_FIRST_PARTY_API_KEY" || true
```

Placeholders like `psk_live_your_key_here` in documentation are okay. Real keys are not.

## Lighthouse Notes

Local Lighthouse was run against a local production server on port `3005`.

Before optimization:

- Mobile performance: `44`
- Desktop performance: `76`
- Total transfer: about `6.2 MB`
- Biggest issue: heavy GIF/image assets and too much client-side work.

After optimization with GA disabled:

- Mobile performance: `88`
- Desktop performance: `99`
- Mobile transfer: `527 KiB`
- Desktop transfer: `549 KiB`

After adding GA back with `NEXT_PUBLIC_GA_ID=G-PEJTT3E11V`:

- Mobile performance: `74`
- Desktop performance: `99`
- Mobile transfer: `689 KiB`
- Desktop transfer: `710 KiB`

Why mobile dropped with GA:

- GA adds `gtag.js` from Google Tag Manager.
- Lighthouse mobile throttling heavily penalizes third-party JavaScript main-thread work.
- Desktop remains excellent because the CPU/network budget is much less constrained.

Current result is still a strong improvement from the original mobile `44` to GA-enabled mobile `74`, while keeping analytics active.
