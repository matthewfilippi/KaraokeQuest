# KaraokeQuest: FL

A static treasure-map karaoke locator for Florida.

## Upload to GitHub

1. Create a GitHub repository named `KaraokeQuest`.
2. Upload everything in this folder to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `login-treasure-map.png`
3. To publish it, open the repo's **Settings > Pages** and deploy from the `main` branch root.

## Notes

- The login is `Flippers808` and the password is `Weemen`.
- Pins and ledger entries are saved in the visitor's browser using `localStorage`.
- The Alcohol page lists only pins marked as alcohol-confirmed with a low and high price range, sorted from less expensive to more expensive.
- The map uses live OpenStreetMap tiles through Leaflet and is limited to Florida.
- The site will use `JackSkull.woff2` if you add a licensed copy of the Jack Skull font to the repository root. Until then, it uses pirate-style fallback fonts.
