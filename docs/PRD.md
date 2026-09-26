# Dcnstrct — product contract

Help developers understand an unfamiliar application by performing an action and exploring its observed journey with evidence-linked IBM Bob explanations.

First version: one synthetic order app. Cancellation before fulfillment succeeds; cancellation after shipment is refused and points to the return boundary. A queued worker checks current state and skips canceled orders. Notifications are synthetic persisted records, not real email.

Judge path: landing -> Explore demo -> cancel preparing order -> explore journey -> inspect eligibility/worker source and evidence -> try shipped order -> compare branches -> reset.

Acceptance: real backend/database/worker operations; ordered events with source references; actual Bob MCP session produces validated explanations; source/evidence references resolve; recorded analysis labeled; fresh visitors need no Bob account; repeat/reset and isolation work.

Out of scope: automatic repair, arbitrary repos/uploads, production traffic, auth/billing, multiple frameworks and generic chat. Demonstrate fewer manual switches among UI/logs/source; do not invent time savings or Bob contribution percentages.
