# umamo.org

The landing page for [Umamo](https://github.com/umamoorg/umamo), an open-source cross-platform rigging editor for 2D puppet animation.

It is a single static page: plain HTML, [Bootstrap 5.3](https://getbootstrap.com/) from the jsDelivr CDN, one small stylesheet and one small script. There is no build step.

```
src/            the site; deploy this directory as-is
	index.html
	css/site.css  dark palette, purple accent, a few components
	js/site.js    release version, download links, OS detection, lightbox
	assets/       icon, favicon, screenshots and placeholders
docs/           notes (not published)
```

## Preview locally

```sh
python3 -m http.server 8000 -d src
```

Then open <http://localhost:8000>. Any static file server works; the page has no server-side parts.

## Deploy

Upload the contents of `src/` to the web host. Nothing else is needed.

## Bump the release version

Download links are **not** fetched from GitHub at runtime. They are built from one
constant at the top of [src/js/site.js](src/js/site.js):

```js
const RELEASE = {
	version: '0.2.1-dev', // as it appears in the asset file names
	tag: 'v0.2.1-dev',    // git tag of the GitHub release
	date: '2026-08-11',   // ISO date the release was published
};
```

1. Edit `version`, `tag` and `date` to match the new [GitHub release](https://github.com/umamoorg/umamo/releases).
2. Check the release's asset names still follow `umamo-<target>-<version>.<ext>` and that the targets in the `TARGETS` array still exist (Windows ships `.zip`, Linux `.tar.gz`, MacOS `.jar` only). Adjust `TARGETS` if a platform was added or dropped.
3. Confirm every link resolves (GitHub answers `302` for a real asset, `404` otherwise):

	 ```sh
	 node -e '
		const s = require("./src/js/site.js");
		const urls = [s.checksumsUrl()];
		for (const t of s.TARGETS) {
			if (t.standalone) urls.push(s.downloadUrl(t.id, t.standalone));
			urls.push(s.downloadUrl(t.id, "jar"));
		}
		console.log(urls.join("\n"));
	' | xargs -I{} sh -c 'printf "%s  %s\n" "$(curl -s -o /dev/null -w "%{http_code}" -I "{}")" "{}"'
	 ```

4. Load the page and click the primary button and a few table entries.

The version strings inside `index.html` (badge, install commands) are filled in by the script, so there is nothing to edit there.