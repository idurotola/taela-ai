# internal/email

TaelaAI's outbound email service. Handlers never call a provider directly —
they call a `*email.Service`, which handles both:

- **Internal / transactional notifications** — password resets, welcome
  emails, application updates, ... (`Service.SendTransactional`, or a
  named helper like `Service.SendPasswordReset` in `templates.go`)
- **Marketing email** — product announcements, digests, campaigns, ...
  (`Service.SendMarketing`)

```go
err := emailSvc.SendPasswordReset(ctx, email.Recipient{Email: user.Email, Name: user.Name}, resetLink)

err := emailSvc.SendMarketing(ctx, recipients, "New: Auto-Apply is live", textBody, htmlBody, "product-update")
```

## Why it's split this way

- `email.go` — the `Provider` interface, `Message`/`Recipient` types, and
  `Service` (default-From handling + the transactional/marketing split).
  This file has **zero knowledge of any specific email vendor**.
- `templates.go` — the copy for each internal notification TaelaAI sends,
  as methods on `Service`. Adding a new notification (e.g. "application
  moved to interviewing") means adding one method here, not touching any
  provider code.
- `logging.go` — a `Provider` that logs instead of sending, used when no
  real provider is configured (e.g. local dev).
- `providers/mailtrap/` — the Mailtrap implementation of `Provider`, over
  Mailtrap's official Go SDK (`github.com/mailtrap/mailtrap-go`). This is
  the only file in the whole app that knows Mailtrap exists. It routes
  `KindMarketing` sends over Mailtrap's bulk host and everything else over
  the transactional host — Mailtrap's own split lines up with ours.

## Swapping providers (e.g. to Mailchimp or Mailjet)

1. Create `internal/email/providers/<name>/<name>.go` with a type that
   implements:

   ```go
   type Provider interface {
       Send(ctx context.Context, msg Message) error
   }
   ```

   Translate `email.Message` into whatever shape that vendor's API/SDK
   wants. `providers/mailtrap/mailtrap.go` is a complete example to copy
   from — using that vendor's official SDK if it has one (as Mailtrap's
   does) is fine; `Provider` only cares about the `Send` method.

2. Wire it into the factory in `cmd/api/main.go` (`buildEmailService`):

   ```go
   case "mailjet":
       provider = mailjet.Provider{APIKey: cfg.MailjetAPIKey, APISecret: cfg.MailjetAPISecret}
   ```

3. Add whatever config the new provider needs to `internal/config/config.go`
   and `.env.example`, and set `EMAIL_PROVIDER=<name>`.

Nothing in `handlers/`, `templates.go`, or `email.go` changes — they only
ever talk to `*email.Service`.

## Local dev

Leave `MAILTRAP_API_TOKEN` unset and the service logs every email to
stdout instead of sending it — no credentials needed to exercise the
password reset / welcome / marketing flows locally.

To actually see delivered mail without spamming real inboxes, set
`MAILTRAP_SANDBOX=true` and `MAILTRAP_SANDBOX_ID` to a Mailtrap Testing
inbox ID — every send (internal or marketing) lands there instead of a
real mailbox. Set `MAILTRAP_SANDBOX=false` (or unset it) to send for real.
