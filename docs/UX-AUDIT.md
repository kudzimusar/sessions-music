# Sessions — product interpretation and competitive UX audit

Last reviewed: **11 September 2026**.

Source of truth: the Sessions product brief, existing repository, roadmap, stakeholder/business material and the implementation already shipped in this project. The current product is not being reinvented from a standalone prompt; the existing booking, registry, provider, operations and persistence architecture is preserved.

Sessions is a Zimbabwe music-rehearsal infrastructure marketplace. The primary promise remains **“I need somewhere to rehearse.”** It is not a generic appointment app, musician social network, streaming product, events product or general classifieds marketplace. The core transaction is discovery → equipment/capacity fit → valid time inventory → checkout → confirmation → repeat booking. Institutional idle capacity and provider-controlled prices remain first-class.

## Public UX research

| Product | Useful public pattern | Sessions adaptation |
|---|---|---|
| Pirate Studios | Rehearsal-specific room presentation, clear equipment expectations, operational studio booking and prominent booking actions | Music equipment is visible before checkout; room pages put real slot inventory and the booking action beside the room information |
| Peerspace | Photography-led hourly-space discovery, useful top-level filters, per-hour price, capacity, favourites and list/map evaluation | Stronger room photography hierarchy, compact high-signal cards, list/map modes and faster comparison without opening every listing |
| Tagvenue | Dense but scannable venue filtering around capacity, location, price, amenities and restrictions | Filters are organised around actual rehearsal fit: musicians, equipment, power, access, booking type, rating and cancellation flexibility |
| AllBooked and studio schedulers | Room-level availability, minimum durations, buffers and conflict prevention | Public hours, institutional blocks, reset buffers, approval holds, recurring validation and atomic slot claims remain inventory rules, not visual decoration |
| Airbnb | Photography hierarchy, saved listings, trust cues and a detail page that progressively answers practical questions | Saved rooms, provider/review context, practical access information, policies and a calmer photo-first detail structure |
| Calendly | Focused date/time decision, clear selectable versus unavailable slots and low-friction confirmation | The booking panel keeps date, duration, actual start times and recurrence together, with unavailable inventory disabled and explicit Zimbabwe-local time |

Research uses public pages and publicly visible product imagery only. No proprietary graphics, logos or exact layouts are copied. The goal is to combine proven interaction patterns and adapt them to Zimbabwean rehearsal needs.

## Information architecture and flows

- Customer: Discover → search/filter → room → slot → checkout → confirmation → booking → rebook/repeat → completed-booking review.
- Provider: Dashboard → calendar → rooms → bookings → payouts → settings. Providers control room prices, public hours, internal use, blocks and booking approval.
- Operations: provider/room trust state → booking/payment lookup → incidents/disputes → review moderation → fee rules.
- Real registry: sourced Harare profiles remain evidence-first and do not pretend unclaimed studios are live marketplace inventory.
- Future adjacent music marketplaces should reuse identity, availability, payment and trust primitives only after rehearsal-marketplace liquidity is proven.

## Design system

Light is the default. Core palette: canvas `#F7F9FC`, surface `#FFFFFF`, Sessions deep blue `#1F4E79`, ink `#101828`, slate `#667085`, soft blue-grey `#EEF3F8`, interactive blue `#2F80ED`. Green is reserved for genuine availability/confirmation/success states; warning and destructive colours are semantic only.

The 11 September polish pass intentionally moves Sessions away from a dense software-dashboard feel and toward a premium music-space marketplace:

- room imagery carries more visual energy; cards gain a clear contained surface, stronger hierarchy and more breathing room;
- the main search remains the dominant action, while smart search stays subordinate and explains the interpreted constraints;
- detail pages keep room evidence and rules on the left and time inventory in a stable booking panel on larger screens;
- mobile uses larger type and controls, scrollable filter rails, one-column cards, safe-area-aware bottom navigation and a persistent “choose a slot” action;
- provider and operations screens use whitespace, scrollable tabs and overflow-safe tables rather than shrinking dense information;
- the real studio registry keeps its evidence/claiming distinctions but shares the same spacing, blue system, card geometry and interaction quality;
- focus visibility, 44px-class touch targets, reduced-motion handling and keyboard-friendly dialogs remain explicit requirements.

## Product truth and demo truth

The fictional rehearsal marketplace is clearly labelled sample/demo inventory and never presented as verified real businesses. The sourced registry is a separate real-place discovery layer; unclaimed or non-bookable studios are not represented as available inventory. “Verified” or “demo checked” must never be described as a guarantee of personal safety.

The service fee remains configurable. Providers keep price sovereignty. USD is the enabled demo checkout currency while the model remains ZiG-ready. Payment, AI, notification and other external services stay behind replaceable abstractions until production credentials and launch controls exist.
