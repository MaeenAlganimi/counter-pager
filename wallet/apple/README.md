# Apple Wallet signing scaffold

This standalone Node script generates a signed `.pkpass`. It is deliberately outside the Deno Edge Function. The `apple_wallet` action reports unavailable until a trusted signing service is deployed and wired into that action.

1. Create an Apple Developer pass type ID and its Pass Type ID signing certificate. Export the certificate and private key as PEM. Download Apple's WWDR intermediate certificate as PEM.
2. In this directory run `npm install`.
3. Set `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, and file paths `APPLE_SIGNER_CERT`, `APPLE_SIGNER_KEY`, `APPLE_WWDR_CERT`. Optionally set `APPLE_SIGNER_KEY_PASSPHRASE`.
4. Prepare `ticket.json`: `{"ticket":{"id":"uuid","number":12,"status":"waiting","eta_at":"2026-10-24T14:35:00Z"},"business":{"name":"The daily café"},"app_url":"https://your-app.example"}`.
5. Run `npm run generate -- ticket.json order.pkpass`.

For integration, deploy an authenticated Node signer. The Edge Function must verify the ticket first, call the signer server to server, and return a short-lived download URL with `available:true`. Serve files as `application/vnd.apple.pkpass`. Store `apple_pass_type_id`, `apple_team_id`, `apple_signer_cert`, `apple_signer_key`, and `apple_wwdr_cert` in the protected secrets store (or a server secret manager). Never expose certificates or private keys to the client. Add Apple pass web service registration and APNs updates separately if live Wallet pass updates are desired; the scaffold creates a static snapshot linking back to the live ticket.
