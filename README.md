# Empowerment Therapy website

Edit shared footer content in Pages CMS under **Site footer**. This includes social
links, book links and cover, navigation, team photos and names, the contact email,
support labels and payment link/QR image, and the copyright line. Add, remove, or
reorder navigation links and people there. The email also updates the Contact page;
form submission delivery and the PayPal subscription plan remain in their existing
code configuration.

Saving to `main` triggers the GitHub Pages workflow. After deployment completes,
every page contains the updated footer, including when JavaScript is disabled.
There are no individual page footers to maintain.

For previews, open any source page with VS Code Live Server or Live Preview as
usual. The shared footer loads automatically from its CMS data and template;
refresh after editing content. No build is needed for this preview.

To test and preview the published output (Node 22 or newer, no npm packages required):

```sh
node --test
node scripts/build-site.cjs
python -m http.server 8000 --directory _site
```

Open http://localhost:8000. Rebuild to update this published-output preview.
Source HTML contains a `<div id="site-footer"></div>` placeholder that the browser
preview loader fills, while published pages contain the footer before scripts run.
The build combines `data/footer.json` and `templates/footer.html` into each page,
copies public assets, and derives the Contact page email in the published
`data/pages.json`. `_site` is generated and ignored by Git. GitHub Pages publishes
only that directory; CMS configuration, templates, scripts and tests remain in
the source repository and are not included in the published website.
