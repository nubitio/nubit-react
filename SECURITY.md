# Security policy

## Reporting a vulnerability

Report privately through GitHub: open the **Security** tab of this repository
and choose **Report a vulnerability**. That opens a private advisory visible
only to you and the maintainers.

Please do **not** open a public issue, pull request, or discussion for a
suspected vulnerability.

Include the affected package and version, the browser, and a reproduction if
you have one — a minimal resource definition plus the API response that
triggers it is usually enough.

### What to expect

- **Acknowledgement within 5 business days.** If you have not heard back,
  assume the report was missed and escalate by opening a public issue that says
  only that you filed an advisory and got no reply — no details.
- An assessment of severity and affected versions, and a fix timeline, once the
  report is confirmed.
- Credit in the advisory unless you ask otherwise.
- We ask that you hold public disclosure until a patched release exists, or 90
  days from the report, whichever comes first.

There is no bug bounty.

## Supported versions

Only the current minor line receives security fixes.

| Line   | Status                            |
| ------ | --------------------------------- |
| 0.11.x | Supported                         |
| < 0.11 | Not supported — upgrade to 0.11.x |

All `@nubitio/*` packages release in lockstep, so the line above applies to
every package in this repository. These packages are pre-1.0: a minor bump may
contain breaking changes, and older lines do not receive backports. A longer
support window will be declared with 1.0, not before.

The backend counterpart,
[`nubit-symfony`](https://github.com/nubitio/nubit-symfony), versions
independently; `nubit-compatibility.json` in
[`nubit-skeleton`](https://github.com/nubitio/nubit-skeleton) declares which
lines are verified against each other.

## Scope

This is a frontend rendering engine. It holds credentials in the browser and
renders data the API returns, so the failure classes that matter here are:

- **Cross-site scripting** — anywhere API data reaches the DOM without
  escaping. The HTML field type and `contentRender` are the deliberate
  exceptions; a report that these render markup is not a vulnerability, but a
  path where a _non-HTML_ field renders markup is.
- **Token handling** — access or refresh tokens reaching `localStorage`, a log,
  an error report, or a cross-origin request that should not carry them.
- **Leaking data across resources** — cached query data served to a view that
  should not have it, or state surviving a logout.

**Client-side permissions are not a security boundary and never were.**
`usePermissions` and `useFieldPermissions` decide what the UI _offers_. The
backend decides what is _allowed_. A report that the UI can be made to display
a button, a column, or a form field the user lacks permission for is working as
designed — the request behind it still returns 403. A report that the request
itself succeeds is a backend issue; file it against
[`nubit-symfony`](https://github.com/nubitio/nubit-symfony).

Out of scope: vulnerabilities in React, DevExtreme, TipTap or other
dependencies — report those upstream; and anything requiring an attacker to
already control the API the application talks to.
