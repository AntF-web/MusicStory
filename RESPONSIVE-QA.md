# Responsive Visual QA — Music Story by Red Ant

QA pass performed on the current public site and private editor using headless Chromium at representative viewport sizes.

## Public site viewports checked

- iPhone SE — 375 × 667
- iPhone 15 Pro — 393 × 852
- Pixel 8 — 412 × 915
- iPad mini portrait — 768 × 1024
- iPad Pro portrait — 1024 × 1366
- Laptop — 1366 × 768
- Desktop — 1920 × 1080
- Ultrawide — 2560 × 1080

The title page, sticky decade navigation, timeline cards and Story/Cinema Mode were reviewed. EN and FR title screens were also checked at phone/laptop sizes.

## Private editor viewports checked

- Phone — 393 × 852
- Tablet — 768 × 1024
- Laptop — 1366 × 768
- Desktop — 1920 × 1080

The PIN gate, track list and track form were reviewed.

## Issues fixed in this pass

1. **1366 × 768 title screen was taller than the viewport.** The large title and descriptive copy pushed the main actions below the fold. A short-landscape-height layout now scales the typography and vertical spacing so the full opening composition, actions and ticker fit in one screen in both EN and FR.

2. **iPad Pro portrait used the desktop two-column Story layout.** This created a narrow copy column and a lot of unused vertical space. The tablet breakpoint now switches Story Mode to the stacked media/copy layout through 1100px.

3. **Desktop editor produced a very tall combined page.** The 83-track list made the whole editing surface thousands of pixels tall. On desktop, the track rail and edit form now use independent viewport-height scrolling panes. Tablet/phone still use the stacked layout.

4. **Mobile track selection ergonomics.** Selecting a track on screens up to 900px now brings the edit area into view automatically.

## Results after fixes

- No document-level horizontal overflow in the tested public viewports.
- No document-level horizontal overflow in the tested editor viewports.
- Story Mode controls remain fully visible at the bottom of the tested phone/tablet/desktop sizes.
- Touch controls stay at practical heights (Story controls 58px; language buttons approximately 34–38px).
- The EN/FR selector remains at the top of the opening title page.

## Scope note

These are viewport/layout tests in Chromium, not screenshots from physical iOS/Android hardware or Safari/WebKit. External YouTube playback itself was not exercised during this visual pass because the test environment restricts external/local browser navigation; responsive player sizing is still controlled by the site's full-size iframe rules. For local YouTube testing, use `START-LOCAL-SERVER.bat` or another localhost server as described in the README.
