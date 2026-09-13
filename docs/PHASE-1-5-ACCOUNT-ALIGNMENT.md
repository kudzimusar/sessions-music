# Phase 1–5 Account and Resource Alignment

Status: BINDING CLARIFICATION FROM VERSION 18 UAT
Date: 13 September 2026
Phase: 5

## One identity, multiple contexts

A Sessions user has one identity. Personal/customer, Provider and Corporate are authorized workspace contexts and relationships attached to that identity, not separate accounts.

Shared identity facts include the user ID, verified contacts, authentication/session posture, consent/lifecycle state and security configuration. Provider and Corporate contexts add scoped operational relationships and authority without forking those identity facts.

## Native vs desktop detail

Native mobile and desktop/PWA may intentionally expose different amounts of information on a given screen because their task models differ. Native Profile should prioritize identity, essential security entry points and workspace switching. Desktop Account may expose denser account/security administration.

This difference is presentation only. If the same factual field is shown on two surfaces, both must derive from the same authoritative state and must not disagree.

## Shared marketplace resources

The following must remain canonical across mobile and desktop surfaces:

- provider/studio identity and status;
- studio descriptions and factual attributes;
- rooms, equipment and services;
- uploaded media and evidence visibility according to policy;
- provider-controlled pricing;
- availability and booking state;
- booking history and notifications;
- provider memberships and staff relationships;
- Corporate workforce/role relationships where authorized;
- identity/security/session state.

A surface may crop, order, animate or progressively disclose canonical media differently, but it must not substitute fabricated media or facts merely to fill a layout.

## Surface-specific composition

Allowed differences include navigation, information density, typography, motion, gestures, transitions, screen hierarchy, sheets/drawers, table vs list presentation and other platform-appropriate interaction patterns.

Those differences must never create a parallel database, a second account, duplicate booking truth, duplicate pricing, or divergent authorization.
