/* ==========================================================================
 * umamo.org — site script
 *
 * VERSION BUMP: change RELEASE below.  Every download link, the version
 * badge, and the release date on the page are derived from it.  Asset names
 * must follow the pattern
 *
 *     umamo-<target>-<version>.<ext>
 *
 * as published on https://github.com/umamoorg/umamo/releases .  If a release
 * adds or drops a build target, edit TARGETS as well.
 * ========================================================================== */
'use strict';

const RELEASE = {
	version: '0.2.1-dev', // as it appears in the asset file names
	tag: 'v0.2.1-dev',    // git tag of the GitHub release
	date: '2026-08-11',   // ISO date the release was published
};

const REPO_URL = 'https://github.com/umamoorg/umamo';
const RELEASES_URL = REPO_URL + '/releases';
const LATEST_URL = RELEASES_URL + '/latest';

/* One row per build target.  `standalone` is the archive extension of the
 * no-Java-required build, or null when only a .jar is published. */
const TARGETS = [
	{ id: 'windows-x64', label: 'Windows (x64)',         standalone: 'zip' },
	{ id: 'macos-arm64', label: 'MacOS (Apple Silicon)', standalone: null },
	{ id: 'macos-x64',   label: 'MacOS (Intel)',         standalone: null },
	{ id: 'linux-x64',   label: 'Linux (x64)',           standalone: 'tar.gz' },
	{ id: 'linux-arm64', label: 'Linux (arm64)',         standalone: 'tar.gz' },
];

/* ---- URL helpers ------------------------------------------------------ */

function releaseUrl() {
	return RELEASES_URL + '/tag/' + RELEASE.tag;
}

function assetName(targetId, ext) {
	return 'umamo-' + targetId + '-' + RELEASE.version + '.' + ext;
}

function downloadUrl(targetId, ext) {
	return RELEASES_URL + '/download/' + RELEASE.tag + '/' + assetName(targetId, ext);
}

function checksumsUrl() {
	return RELEASES_URL + '/download/' + RELEASE.tag + '/SHA256SUMS.txt';
}

function findTarget(id) {
	return TARGETS.find(function (t) { return t.id === id; }) || null;
}

/* ---- Platform detection ----------------------------------------------- */

/* Returns the id of the most likely TARGETS entry for this browser, or null
 * when there is no desktop build to offer (phones, tablets, unknown). */
function detectTarget(nav) {
	nav = nav || navigator;
	var ua = String(nav.userAgent || '').toLowerCase();
	var platform = String((nav.userAgentData && nav.userAgentData.platform) || nav.platform || '').toLowerCase();

	if (/android/.test(ua) || /android/.test(platform)) return null;
	if (/iphone|ipad|ipod/.test(ua) || /ios/.test(platform)) return null;
	if (/win/.test(platform) || /windows/.test(ua)) return 'windows-x64';
	if (/mac/.test(platform) || /macintosh|mac os x/.test(ua)) {
		// iPadOS Safari reports itself as a Mac but has a touch screen.
		if (nav.maxTouchPoints > 1) return null;
		// Browsers hide Apple Silicon vs Intel; default to arm64, offer x64 beside it.
		return 'macos-arm64';
	}
	if (/linux|x11/.test(platform) || /linux|x11/.test(ua)) {
		return /aarch64|arm64|armv8/.test(ua) ? 'linux-arm64' : 'linux-x64';
	}
	return null;
}

/* ---- DOM helpers ------------------------------------------------------ */

function el(tag, attrs, children) {
	var node = document.createElement(tag);
	if (attrs) {
		Object.keys(attrs).forEach(function (k) {
			if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
		});
	}
	(children || []).forEach(function (c) {
		node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
	});
	return node;
}

function setAll(selector, fn) {
	document.querySelectorAll(selector).forEach(fn);
}

function formatDate(iso) {
	try {
		return new Intl.DateTimeFormat(undefined, {
			year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
		}).format(new Date(iso + 'T00:00:00Z'));
	} catch (e) {
		return iso;
	}
}

/* ---- Page wiring ------------------------------------------------------ */

function fillReleaseLabels() {
	setAll('[data-release-version]', function (n) { n.textContent = RELEASE.version; });
	setAll('[data-release-tag]', function (n) { n.textContent = RELEASE.tag; });
	setAll('[data-release-badge]', function (n) { n.hidden = false; });
	setAll('[data-release-date]', function (n) {
		n.textContent = formatDate(RELEASE.date);
		if (n.tagName === 'TIME') n.setAttribute('datetime', RELEASE.date);
	});
	setAll('[data-release-link]', function (a) { a.href = releaseUrl(); });
	setAll('[data-checksums-link]', function (a) { a.href = checksumsUrl(); });
}

function setupPrimaryButtons() {
	var target = findTarget(detectTarget());
	var ext = target ? (target.standalone || 'jar') : null;

	setAll('[data-download-primary]', function (btn) {
		var label = btn.querySelector('[data-download-label]') || btn;
		if (target) {
			btn.href = downloadUrl(target.id, ext);
			label.textContent = 'Download for ' + target.label;
		} else {
			btn.href = releaseUrl();
			label.textContent = 'See all downloads';
		}
	});

	setAll('[data-download-hint]', function (p) {
		p.replaceChildren();
		if (!target) {
			p.appendChild(document.createTextNode(
				'Umamo runs on Windows, MacOS and Linux. Android tablet support is in progress.'));
			return;
		}
		p.appendChild(el('code', null, [assetName(target.id, ext)]));
		p.appendChild(document.createTextNode(
			ext === 'jar' ? ' · Needs Java 21 or newer · ' : ' · No Java required · '));
		p.appendChild(el('a', { href: '#all-downloads' }, ['Other platforms']));
	});

	setAll('[data-download-alt]', function (p) {
		p.replaceChildren();
		if (!target || target.id !== 'macos-arm64') { p.hidden = true; return; }
		p.hidden = false;
		p.appendChild(document.createTextNode('Intel Mac? '));
		p.appendChild(el('a', { href: downloadUrl('macos-x64', 'jar') }, ['Download the x64 build']));
		p.appendChild(document.createTextNode(' instead.'));
	});
}

function renderDownloadTable() {
	var tbody = document.querySelector('[data-download-table]');
	if (!tbody) return;
	tbody.replaceChildren();

	TARGETS.forEach(function (t) {
		var standaloneCell = t.standalone
			? el('a', { class: 'btn btn-sm btn-outline-primary', href: downloadUrl(t.id, t.standalone), title: assetName(t.id, t.standalone) }, ['.' + t.standalone])
			: el('span', { class: 'text-secondary', title: 'Only a .jar build is published for this platform right now.' }, ['—']);
		var jarCell = el('a', { class: 'btn btn-sm btn-outline-primary', href: downloadUrl(t.id, 'jar'), title: assetName(t.id, 'jar') }, ['.jar']);

		tbody.appendChild(el('tr', null, [
			el('th', { scope: 'row', class: 'fw-normal' }, [t.label]),
			el('td', null, [standaloneCell]),
			el('td', null, [jarCell]),
		]));
	});
}

var BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

function setupLightbox() {
	var modal = document.getElementById('lightbox');
	if (!modal) return;
	var img = modal.querySelector('img');
	var caption = modal.querySelector('[data-lightbox-caption]');

	modal.addEventListener('show.bs.modal', function (ev) {
		var trigger = ev.relatedTarget;
		if (!trigger) return;
		img.src = trigger.getAttribute('data-src') || '';
		img.alt = trigger.getAttribute('data-alt') || '';
		caption.textContent = trigger.getAttribute('data-caption') || '';
	});
	modal.addEventListener('hidden.bs.modal', function () {
		img.src = BLANK_GIF;
	});
}

function init() {
	fillReleaseLabels();
	setupPrimaryButtons();
	renderDownloadTable();
	setupLightbox();
	setAll('[data-year]', function (n) { n.textContent = String(new Date().getUTCFullYear()); });
}

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
}

/* Exposed for the link checker in the README (node -e "require('./src/js/site.js')"). */
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		RELEASE: RELEASE,
		TARGETS: TARGETS,
		LATEST_URL: LATEST_URL,
		releaseUrl: releaseUrl,
		assetName: assetName,
		downloadUrl: downloadUrl,
		checksumsUrl: checksumsUrl,
		detectTarget: detectTarget,
	};
}
