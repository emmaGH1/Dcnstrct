# Dcnstrct design contract

## Selected direction

Use the approved light concept: a warm cream page, bold black typography, spacious centered composition and pastel-green primary calls to action. Follow the supplied Notion reference closely for hero proportions, navigation alignment, capsule shape and spacing. Keep Dcnstrct copy and assets. The user rejected the previous first-screen implementation and authorized this focused rebuild.

- Canvas: `#FAFAF7`; surfaces: white; primary text: `#171916`; secondary text: `#595D56`; borders: `#DEDDD5`.
- Primary CTA: pastel green `#BDE4C2` with dark text and a black circular arrow. Reserve green primarily for actions and clear success states.
- Journey numbers use pale stone with charcoal text. Selected journey steps use a light lavender highlight. Status meaning must remain clear without color alone.
- Keep a light theme for this checkpoint. Avoid the OLED treatment, large dark tiles, heavy gradients and pervasive shadows.
- Self-host the official Inter variable font from rsms/inter with its SIL Open Font License in public/fonts. Use weight 700 and tracking -0.035em for display lettering, with normal system fallbacks while loading.

## Landing page

The centered header has the slightly enlarged Dcnstrct mark (48px desktop, 40px phone) and wordmark at left, Product / Resources / IBM Bob links in the middle, and Explore demo at right. Resources points to the real project repository. Keep the navigation compact and avoid a redundant Demo link.

The hero reads **“Understand what happens / and the [journey] behind it.”** It uses two centered lines, large bold type, and a rotating word pill between fixed text. Rotate journey, logic, decisions, effects and evidence about every three seconds. Change the pill and its dot together, reserve enough width to prevent jumps, and keep the pause control discreet beside the pill. Stop rotation when the pill is offscreen or the page is hidden; honor reduced-motion preferences and provide a stable accessible headline.

Center the subtitle and Explore demo CTA beneath the title. The product preview sits below at 67% of the desktop viewport width, capped at 1120px, and uses the available width on mobile. The current preview is an explicitly labeled static workspace skeleton, reserved for a real capture. Replace it only with a real captured interface image or an actual playable demo asset; do not present generated artwork as a real run or video.

The landing page has five substantial, content-led sections:

1. Hero and product preview.
2. How it works: try an action, follow its journey, inspect its evidence.
3. Two real branches: cancellation before fulfillment succeeds; after shipment it is refused.
4. How IBM Bob explains observed events and relevant source. Label the interpretation as recorded and disclose the local MCP workflow accurately.
5. A concise final invitation.

Use editorial step rows, a divided two-branch panel and a white Bob section with a standalone transparent mascot. Avoid redundant eyebrow labels above landing headings. Compact navigation and a useful white project footer sit outside those five sections. Give sections around 50–70vh where the content benefits; let content and small-screen layouts determine their height. Do not add invented customers, measurements, usage claims or authentication UI.

## IBM Bob artwork

Keep the supplied original `public/brand/ibm-bob-mascot.png` unchanged. The landing and workspace use the separately generated transparent derivative `public/brand/ibm-bob-mascot-cutout.png`; preserve its proportions and colors, with no black rectangle or tile behind it. The primary placement is beside the Bob workflow section. A small copy may identify the recorded explanation. Do not use the mascot as a Dcnstrct logo, floating chat launcher or live-execution indicator. Verify asset provenance and attribution before packaging; the user's image alone does not establish licensing.

## Workspace

`/demo` is a naturally scrolling application frame with compact sidebar navigation, an action area and a vertical journey beside selected evidence on desktop. Evidence remains visible while following later steps; below 1001px the inspection areas stack. On phones sidebar links become a compact horizontal row. It contains four anchored steps:

1. Try a cancellation in a synthetic preparing or shipped order.
2. Follow the actual ordered events returned by the application.
3. Select a step to inspect its Explanation / Source / Observed data tabs.
4. Compare both paths only after both real runs exist.

The explanation UI must identify the preserved Bob interpretation as recorded, show its task/date provenance, remap evidence links to the visitor run and keep observations separate from Bob's original text. Source excerpts come only from allowlisted, bounded references and show line numbers and revision. Unmatched or stale interpretations are unavailable; current run observations remain usable. Keep reset scoped to run IDs held by the current visitor tab.

Use natural scrolling, concise sticky navigation, readable source and inline details near the selected event. The worker is synchronous in this demo; do not claim concurrency or real email delivery. Refusal is a completed business result, distinct from partial or failed execution.

## Responsive and interaction requirements

Support keyboard navigation, visible focus, reduced motion, stable hero copy for assistive technology, text labels as well as color, narrow source code, and usable layouts at 375px, 768px and 1440px. The hero and workspace sections must not create horizontal overflow. Inspect actual browser renders before freezing this checkpoint.

## Current media and verification gaps

No real demo video or saved workspace screenshot is confirmed yet. Keep the reserved hero frame explicitly marked as a preview placeholder and omit any dead play control. Capture the built interface from an actual synthetic run before replacing that illustration. The Bob cutout is implemented; official asset licensing still needs packaging review. Hosting, persistence on the selected host and submission remain later checkpoints.
