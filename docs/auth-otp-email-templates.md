# Auth email templates — one-time codes (OTP)

The login flow (`src/components/auth/login-form.tsx`) is passwordless: it calls
`signInWithOtp` and verifies a **6-digit code** with `verifyOtp({ type: "email" })`.

Supabase's default email templates send a magic **link** (`{{ .ConfirmationURL }}`),
not a code. To make the codes arrive, edit the templates so the body includes
`{{ .Token }}`. Do this in:

**Supabase Dashboard → Authentication → Email Templates**

You only need the two templates the OTP flow touches:

- **Magic Link** — used when a *returning* email requests a sign-in code.
- **Confirm signup** — used when a *new* email signs up.

Paste the same body into both (subject can differ). Keeping the link as a
fallback is fine — users can click it or type the code.

> **Paste only the snippet — not this whole file.** The two code blocks below are
> wrapped in markdown for readability; pasting the surrounding text into Supabase
> sends the *documentation* as the email. Use the clean, copy-ready versions:
> - **`docs/email-templates.html`** — open in a browser, one-click copy each field, live preview.
> - **`docs/email-template-magic-link.html`** / **`docs/email-template-confirm-signup.html`** — pure body, copy the whole file.
>
> **Also:** the SMTP **Sender email** must be on a Resend-**verified domain**
> (e.g. `noreply@findersxkeepers.com`). A `@gmail.com` sender is rejected with
> *"Domain not verified."*

---

## Subject

```
Your Finders × Keepers code: {{ .Token }}
```

## Message body (HTML)

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#0B0B0F">
  <h1 style="font-size:18px;font-weight:600;margin:0 0 4px">Finders × Keepers</h1>
  <p style="font-size:14px;color:#5B616E;margin:0 0 24px">
    Use this code to finish signing in. It expires shortly and can only be used once.
  </p>

  <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;font-weight:600;letter-spacing:10px;background:#FCFCFD;border:1px solid #ECEDF1;border-radius:14px;padding:18px 0;text-align:center;color:#0B0B0F">
    {{ .Token }}
  </div>

  <p style="font-size:13px;color:#5B616E;margin:24px 0 0">
    Prefer a link? <a href="{{ .ConfirmationURL }}" style="color:#1D4ED8">Sign in here</a>.
  </p>
  <p style="font-size:12px;color:#9AA0AB;margin:16px 0 0">
    Didn't request this? You can safely ignore this email — no account changes
    were made.
  </p>
</div>
```

---

## Notes

- **Token validity / length.** Defaults to a 6-digit code valid for ~1 hour;
  tune under **Authentication → Sign In / Providers → Email** (OTP expiry). The
  login form's input is fixed to 6 digits — keep the token length at 6.
- **Confirm email setting.** With OTP you do *not* need to turn off "Confirm
  email"; verifying the code confirms the address. The old README tip about
  disabling confirmation is obsolete for this flow.
- **Local dev.** With the Supabase CLI stack, outgoing mail lands in Inbucket
  (`http://localhost:54324`) — grab the code there instead of a real inbox.
- **Why two templates.** `signInWithOtp` sends "Magic Link" for existing users
  and "Confirm signup" for new users (`shouldCreateUser: true`). The form shows
  the matching screen via `lookupAccount`, so both must carry `{{ .Token }}`.
```
