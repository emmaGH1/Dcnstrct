# Dcnstrct design contract

## Current selection — pastel light with neutral journey markers

User selected light cream + pastel green (proposed CTA #BDE4C2 with near-black text), superseding blue and OLED options below. Reserve pastel green mainly for CTA accents, not dark-green numbered journey nodes, selection strips or large panel fills. Use pale stone numbered markers with charcoal numbers, thin neutral connectors and a subtle lavender selected node. Preserve distinguishable textual business status indicators.

Hero must have two centered desktop headline lines, with rotating pill embedded BETWEEN fixed words on second line; headline content about 80% page width. Latest generated copy proposal: Understand your app. / Follow the [journey] behind an action. This wording was introduced to satisfy placement; user has not separately approved the wording change from Understand the journey behind an action. Keep copy open for feedback. Center subtitle and primary CTA beneath. CTA: light pastel green, strong dark label, black circular arrow holder with white arrow. Remove word legend/CTA-side pause. Keep discreet accessible motion control and reduced-motion behavior.

Centered navigation: Product / Resources / IBM Bob, brand left, Explore demo right. No redundant Demo navigation entry. Product/IBM Bob link to actual sections; Resources must resolve to actual repository/documentation, no fake menu destinations. Center the screenshot/video preview at 70–80% viewport width on desktop (target 75%, with suitable max-width), with clear side margins; mobile uses available width safely. The generated refined image is only approximate geometry; actual CSS and responsive review must enforce it. Retain full, roomy useful sections and standalone mascot.

Latest concept .hackathon/ui-previews/landing-pastel-refined.png is a visual reference only. No invented screenshot/sidebar/metadata from generated artwork enters actual implementation. Earlier descriptions are historical; this selection controls conflicting color, markers, nav and hero geometry details.

## Latest user revision — supersedes earlier visual details below

After viewing the first concepts, user rejected the teal/green theme and timid scale. Keep the cream canvas, but use a cleaner blue primary accent (proposed #006FE8) and substantially bolder ink typography. Favor the reference's confident editorial scale and spacious composition. Center two or three nav links between the product mark at left and Explore demo at right. Remove the visible hero word/color legend entirely. Do not put a prominent pause button beside Explore demo: provide a discreet accessible animation pause control near the pill or in motion preferences, plus static reduced-motion behavior.

The rotating pill must sit in the middle of the headline, with fixed text to its left and right. Latest concept uses three centered lines: Understand / the [journey] behind / an action. Preserve the sentence and five rotating words; adapt line breaks to actual available width. Word and pill/dot color change together. No detached word or color legend.

Make useful landing sections more substantial, roughly 50–70vh minimum on desktop where content benefits, with content-driven growth; do not force every section or mobile layout to a viewport height. Expand how-it-works into generous explanatory steps, make the Bob section a focal editorial composition, and give the footer clear Explore/Project groupings. Preserve the real scrolling workspace sequence while improving typography, blue selection/action accents and immediate explanation of the user's task.

User explicitly wants standalone Bob artwork with no black rectangle/tile in landing or workspace. The original supplied asset remains unchanged; create a separate background-removed derivative using image editing before implementation and inspect edge quality. That derivative is NOT yet supplied by these concept mockups. Preserve original mascot colors/shape. Prior instructions requiring a dark tile are superseded.

Private v2 mockups: .hackathon/ui-previews/landing-concept-v2.png and workspace-concept-v2.png. Generated images are layout inspiration only; their recreated logos, wording, fake IDs/source snippets or simplified events are not authoritative. Use actual supplied logo, validated events/source and recorded provenance in the app. The hero must still accommodate the large actual workspace screenshot/video preview; the simplified diagram in v2 is not a replacement requirement. These concepts remain subject to user visual feedback and real browser review.

User-approved direction from the UI planning conversation: borrow the spacious centered hero and large product preview from .hackathon/DESIGN-INSPO.md, then express Dcnstrct's own identity. The reference is inspiration, not a requirement to reproduce Notion's colors, copy, illustrations or interface. No gradients or pervasive shadows. Inter is the suggested font; do not bundle proprietary Notion fonts or copy branding/text/testimonials.

## Palette and visual language

Page canvas #F7F5F0 (subtle cream); white #FFFFFF card/video surfaces; primary text #191919; secondary text #625F59; borders #E3DFD6; primary action #0F766E; teal tint #DCEEE8. Keep white cards distinct from the cream canvas. Hairline borders, 12px cards, 8px buttons and generous spacing. Light theme only for this checkpoint. Keep success/refusal/failure semantics consistent; decorative hero colors never redefine status colors.

Suggested rotating-pill pairs (background / dot): journey #DCEEE8 / #0F766E, logic #ECE3F7 / #7552A3, decisions #F8E3D6 / #AE6138, effects #E0EDF7 / #386F9B, evidence #F4EACD / #8D6A17. Text remains #191919. These exact supplementary shades are implementation suggestions; verify contrast in the actual render.

Use supplied logo unchanged at public/brand/dcnstrct-logo.png; preserve aspect ratio and white background. Product name Dcnstrct. Confirm supplied asset provenance before public submission.

## IBM Bob mascot

User requested the supplied IBM Bob mascot in appropriate UI locations. Asset: public/brand/ibm-bob-mascot.png, copied unchanged from the user's attachment (308x412). It has an opaque #121314 corner/background, not transparency. Preserve original colors and proportions; use a matching small dark illustration tile in the Bob workflow section rather than stretching it or putting a large black rectangle in the cream hero. Keep Dcnstrct's logo as the product identity.

Primary placement: beside section 4, How IBM Bob helps explain it, at approximately 120–160px tall on desktop and smaller on mobile. Secondary placement: optional 28–36px full-mascot thumbnail in the recorded interpretation header, with enough room to remain legible; omit at tiny sizes if it becomes visual noise. Pair with the explicit Recorded IBM Bob interpretation label. Do not use as a floating chat launcher, live-thinking indicator or status marker for actual backend execution. Static artwork is sufficient. Decorative copies use empty alt text when adjacent wording already names Bob; standalone identifying artwork uses IBM Bob mascot. Source/permission attribution remains to be verified during packaging; the user's attachment is not proof of official asset licensing.

## Landing: five sections

Compact navigation and footer are outside the five main sections. Landing / and interactive workspace /demo are distinct views; use existing React/Vite stack and support Back/Forward and direct links.

1. Hero + video preview: centered two-line headline "Understand the [journey] behind an action." Pill cycles journey -> logic -> decisions -> effects -> evidence, changing background and dot together. Hold each word about three seconds; use a short slide/fade with no layout shift. Reserve enough width for the longest word. A subtle mark may reference the execution journey without copying Notion's characters. Supporting text: "Try an action. Follow what happened. Explore the source and evidence with explanations from IBM Bob." Primary Explore demo; secondary Watch walkthrough only when a real playable asset exists. Large actual product preview underneath.
2. How it works: Try an action -> Follow the journey -> Inspect the evidence. Three concise steps with purposeful visuals.
3. One action, two outcomes: cancellation before fulfillment succeeds; after shipment it is refused. Clearly describe synthetic sample scenarios; link to their workspace choices.
4. How IBM Bob helps explain it: describe actual observed events and relevant source, evidence-linked interpretation and recorded delivery. Disclose the demonstrated workflow's source-read fallback in accessible workflow details: Bob list/get/save through MCP; get_source failed and Bob used read_file. No claim of successful Bob get_source or live hosted generation.
5. Final invitation: short closing copy and Explore demo. Footer includes verified GitHub link and project information, no customer-logo wall.

Video is a progressive asset dependency, not a reason to block UI. Use a real screenshot from the built app as the poster until footage exists; do not invent a video, fake screenshot or dead play control. Once available, play the narrated demo on user request with controls and captions. An optional brief muted preview requires an accessible pause control and a still reduced-motion fallback. Video production and deployment are separate checkpoints.

Hero animation needs a pause/resume control, stops when offscreen/hidden, and shows static journey for reduced motion. Screen readers receive a stable complete headline rather than announcements every three seconds. Keep pill and surrounding words readable at 375px; simplify line wrapping rather than shrinking everything. No fictitious customers, measurements or contribution percentages.

## Workspace: guided scrolling exploration
Natural page height, not a locked 100vh three-pane view. Compact sticky header and step anchors; max-width about 1200px.
1. Try an action: roomy order panel and scenario selector, contextual explanation beside it on desktop.
2. Follow the journey: full-width connected execution sequence; reveal after capture and scroll into view only when complete, respecting reduced motion.
3. Inspect evidence: selected step opens inline/temporary detail panel with Explanation / Source / Observed data tabs. Keep journey and detail close; stack on narrow screens.
4. Compare paths: explicit comparison view showing common steps and branch divergence.

Sections are content-sized, not each forced to fill a viewport. No permanently crowded panes or decorative constellation without execution meaning.

States: initial guidance, running/worker pending, completed, legitimate refusal, partial failure, analysis unavailable and reset result. Keyboard-selectable nodes, visible focus, readable source, text plus color, reduced motion and responsive 375/768/1440px checks. Capture real desktop/mobile renders before freeze.
