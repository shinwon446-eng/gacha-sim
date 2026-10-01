# VOILA UI/UX redesign

## Design decisions

- Replace the dense, animated promotional layout with a static editorial hero and a single collection grid. Desktop uses three columns; mobile uses two. Prices and collection names take precedence over multipliers.
- Use an obsidian background, warm ivory primary actions and restrained champagne accents. `web/app/design.css` contains the shared layout and component rules; Tailwind tokens match these colors.
- Consolidate navigation into `SiteHeader`. Mobile settings, authentication and withdrawal remain reachable through the menu; the bottom navigation retains direct access to collections, inventory and wallet.
- Keep the hero stationary while reading. Feature selection is manual, and the labelled free preview uses the selected collection without altering wallet or inventory state.
- Rebuild About, Fairness and Community around their actual tasks. Simplify empty states, repeated promotional copy, typography, section spacing and icons. Update Korean, English and Chinese together.
- Show prices, quantities, total cost and item probabilities clearly in the detail dialog. Use shared modal behavior for focus containment, nested Escape handling, background scroll locking and focus restoration.
- Respect reduced motion in both CSS and Framer Motion, including imperative roulette animation and result effects.
- Bundle existing collection photography and the licensed Pretendard variable font locally. Preserve source attribution and the font license. Photos remain illustrative; the detail view states this explicitly.

## Independent review

Claude Code was invoked with `claude-fable-5-1` and maximum effort. Its successful design report confirmed that model. AGY was invoked with `gemini-3.8-flash-high`; its completed focused review did not report an actual model identifier. Three additional implementation/review agents worked on separate file groups.

Adopted findings included quieter visual hierarchy, larger product imagery, consistent page navigation, readable probabilities, stable keyboard focus and removal of decorative motion. The AGY findings about nested dialogs, native `summary` focus and missing opener restoration prompted code corrections. The fairness verifier now prevents changing the selected record during an in-progress verification.

Suggestions to preserve blanket cashback claims, retain the previous headline, or force every mobile collection into a single column were not adopted. Existing SKU photography was not assumed to be accurate merely because a URL loaded.

The final independent Claude Fable code review completed successfully and identified three regressions that were then corrected: locale regeneration could overwrite authored UI copy, the nested visual verification dialog had a separate Escape handler, and the inventory bulk action bar used the previous mobile navigation height. The generator now treats checked-in locale JSON as the UI source of truth; the verifier uses the shared modal stack; the action bar includes the 64px navigation and safe area. Feature selection also has an explicit group role, and collection button names include their visible prices.

A final screenshot review found that long English inventory actions could be clipped inside the summary panel even though the page had no horizontal overflow. Mobile summary actions now stack vertically and fill the available width.

## Verification

Validation covers domain tests, TypeScript/production export, viewport checks, keyboard navigation and the main discovery/detail/wallet/authentication flows. Browser checks use isolated local contexts and do not submit real payments or delivery requests.

- `npm test`: 197 passed, 0 failed. The image integrity test also checks that locally bundled files exist and contain valid WebP headers.
- `GITHUB_PAGES=true npm run build`: passed, including TypeScript validation and 32 generated static pages.
- Static export: 18 routes across Korean, English and Chinese returned 200. Four full-page browser checks found no page errors, failed assets, unloaded collection images or horizontal overflow.
- Shared layout: widths 375, 390, 768, 1280 and 1440 checked. About, Fairness and Community checked on desktop and mobile.
- Interaction checks: category filtering/sorting, home reset, dollar category, withdrawal deep link, nested modal Escape/Tab, insufficient-balance wallet entry, auth focus restoration, community review entry and reduced-motion free preview passed.
- A seeded physical-item opening confirmed that closing the nested fairness verifier retains the result dialog, selling/shipping actions, focus and scroll lock. The selected-inventory action bar sits above the mobile navigation.
- Final rebuilt export: English inventory actions at 375px remain inside the summary panel and meet the 44px height target; nested verifier and selected-inventory checks pass again.
- `git diff --check`: passed.
- Locale generator: two isolated regeneration runs preserve all three authored UI trees and every catalogue key, with identical second-run output.

The source branch remains `feat/netflix-gacha-web`. Deployment is a separate action; the redesign does not configure missing production payment, authentication or shipping services.
