# Sessions — product interpretation and competitive UX audit

Source of truth: uploaded Pasted text(3).txt (37 sections). No earlier Sessions source or project documents were present in this workspace. This is a new Sites Vinext/React project; preserve its existing toolchain.

Sessions is a Zimbabwe music rehearsal infrastructure marketplace. It is not a generic appointment app, social network, streaming product, or events platform. The transaction is discovery → equipment/capacity fit → valid time inventory → checkout → confirmation → repeat booking. Institutional idle capacity and provider-controlled prices are first-class.

## Public UX research — 31 August 2026

| Product | Observed pattern | Sessions adaptation |
|---|---|---|
| [Pirate](https://pirate.com/en/rehearsal-studios/) | Equipment-specific room categories, live booking calendar, explicit setup/pack-down guidance | Equipment on result cards; actual slot calculation and buffers |
| [Peerspace](https://www.peerspace.com/pages/listings/61328e2cebdd9f000dffba1e) | Photography, hourly price/minimum duration, instant book and cancellation explanation | Photo-first cards and clear itemized checkout; no copied branding/layout |
| [Tagvenue](https://www.tagvenue.com/hire/rehearsal-studios/london) | Capacity, neighbourhood, price and restrictions in discovery | Group capacity, location, equipment and access filters |
| [AllBooked](https://www.allbooked.com/solutions/music-studio-booking-software) | Individual rooms, availability, minimum lengths and conflict prevention | Provider weekly hours, internal blocks, approval queue, atomic inventory claims |
| [Airbnb](https://www.airbnb.com/help/article/1236) | Heart-based saved spaces, returning to shortlist | Durable favourites and side-by-side equipment comparison |
| [Calendly](https://calendly.com/scheduling) | Buffers, custom schedules, straightforward slot selection and confirmation | One clear slot picker, Zimbabwe-local time and downloadable calendar event |

Research used publicly accessible pages and search results. No authenticated product flows were audited. These are adapted patterns, not claims of feature parity.

## Information architecture and flows
- Discover / space detail / checkout / confirmation / bookings / saved / profile.
- Provider: dashboard / calendar / rooms / bookings / payouts / settings.
- Operations: inventory and provider verification / bookings and payment records / incident queue / fee configuration.
- Musician: filter → select room → validate slot(s) → simulated payment → persisted reservation → receipt → rebook/cancel/review.
- Provider: create/edit room → equipment, pricing, opening hours → availability blocks → manage requests → revenue records.

## Design system
Light canvas #F7F9FC, deep blue #1F4E79, ink #101828, secondary slate #667085, action blue #2F80ED. Calm spacious sans-serif typography. Warm room photography supplies visual energy. Strong discovery search above image-led inventory, concise equipment indicators, generous mobile targets, persistent mobile navigation. Green means availability/confirmation only. All inventory and photography are demo/illustrative.
