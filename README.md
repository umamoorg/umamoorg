# umamo.org

The landing page for [Umamo](https://github.com/umamoorg/umamo), an open-source cross-platform modelling editor for 2D puppet animation.

## Preview Locally

You can use a Python HTTP server to quickly preview the site.

```sh
python3 -m http.server 8000 -d src
```

Then open <http://localhost:8000>.

## Bumping the Release Version

Download links are **not** fetched from GitHub at runtime. They are built from one constant at the top of [src/js/site.js](src/js/site.js):

```js
const RELEASE = {
	version: '0.4.0',      //As it appears in the asset file names.
	tag: 'v0.4.0',        //Git tag of the GitHub release.
	date: '2026-10-01',   //ISO date the release was published.
};
```

1. Edit `version`, `tag` and `date` to match the new [GitHub release](https://github.com/umamoorg/umamo/releases).
2. Double check that the download links work properly before updating the web site.