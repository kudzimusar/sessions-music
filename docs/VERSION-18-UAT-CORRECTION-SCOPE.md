# Version 18 UAT Correction Scope

This branch closes the Phase 1–5 UAT findings raised against private Site Version 18. It does not implement Phase 6.

Target surfaces: `customer-native`, `provider-native`, `provider-web`, `shared-backend` presentation contract.

Acceptance points:

- customer-native bottom navigation persists across nested mobile routes;
- canonical Sessions mark is shared across native/provider/desktop product chrome;
- Profile represents one Sessions identity with authorized workspace contexts;
- mobile and desktop project the same canonical studio/media/pricing/booking/security truth;
- private PWA manifest is requested with credentials rather than weakening route authorization;
- provider promotion/featured-services monetization is documented for Phase 6 only;
- next hosted UAT is performed separately in iOS and Android simulators.
