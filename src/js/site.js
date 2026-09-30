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
	version: '0.4.0', // as it appears in the asset file names
	tag: 'v0.4.0',    // git tag of the GitHub release
	date: '2026-10-01',   // ISO date the release was published
};

const REPO_URL = 'https://github.com/umamoorg/umamo';
const RELEASES_URL = REPO_URL + '/releases';
const LATEST_URL = RELEASES_URL + '/latest';

/* One row per build target.  `installers` lists the installer package
 * extensions, the first being the one the download button offers.
 * `portable` is the extension of the unpack-and-run archive, or null when
 * there is none.  Every target also publishes a .jar. */
const TARGETS = [
	{ id: 'windows-x64', label: 'Windows (x64)',         installers: ['msi'],        portable: 'zip' },
	{ id: 'macos-arm64', label: 'MacOS (Apple Silicon)', installers: ['dmg'],        portable: 'zip' },
	{ id: 'macos-x64',   label: 'MacOS (Intel)',         installers: [],             portable: null },
	{ id: 'linux-x64',   label: 'Linux (x64)',           installers: ['deb', 'rpm'], portable: 'tar.gz' },
	{ id: 'linux-arm64', label: 'Linux (arm64)',         installers: ['deb', 'rpm'], portable: 'tar.gz' },
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

function checksumsSignatureUrl() {
	return checksumsUrl() + '.asc';
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

/* Returns the extension of the file the download button offers for `target`:
 * its first installer, or the .rpm when a Linux browser names an RPM-based
 * distribution in its user agent (Fedora's Firefox does). */
function primaryExt(target, nav) {
	if (!target) return null;
	nav = nav || navigator;
	var ua = String(nav.userAgent || '').toLowerCase();
	if (target.installers.indexOf('rpm') !== -1 && /fedora|red hat|centos|rocky|alma|suse/.test(ua)) return 'rpm';
	return target.installers[0] || target.portable || 'jar';
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
	setAll('[data-checksums-sig-link]', function (a) { a.href = checksumsSignatureUrl(); });
}

function extNote(ext) {
	if (ext === 'jar') return 'Needs Java 21 or newer';
	if (ext === 'dmg') return 'Signed and notarized · No Java required';
	if (ext === 'rpm') return 'Signed · No Java required';
	return 'No Java required';
}

function setupPrimaryButtons(target) {
	var ext = primaryExt(target);

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
		p.appendChild(document.createTextNode(' · ' + extNote(ext) + ' · '));
		p.appendChild(el('a', { href: '#all-downloads' }, ['Other platforms']));
	});

	// The build a visitor may need in place of the detected one.
	var alt = null;
	if (target && target.id === 'macos-arm64') {
		alt = { question: 'Intel Mac? ', href: downloadUrl('macos-x64', 'jar'), text: 'Download the x64 build' };
	} else if (target && ext === 'deb') {
		alt = { question: 'Fedora or another RPM distribution? ', href: downloadUrl(target.id, 'rpm'), text: 'Download the .rpm' };
	} else if (target && ext === 'rpm') {
		alt = { question: 'Debian, Ubuntu or Mint? ', href: downloadUrl(target.id, 'deb'), text: 'Download the .deb' };
	}

	setAll('[data-download-alt]', function (p) {
		p.replaceChildren();
		if (!alt) { p.hidden = true; return; }
		p.hidden = false;
		p.appendChild(document.createTextNode(alt.question));
		p.appendChild(el('a', { href: alt.href }, [alt.text]));
		p.appendChild(document.createTextNode(' instead.'));
	});
}

/* Opens the install notes for the visitor's OS instead of always Windows. */
function selectInstallTab(target) {
	if (!target || typeof bootstrap === 'undefined') return;
	var tab = document.getElementById('tab-' + target.id.split('-')[0]);
	if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
}

function renderDownloadTable() {
	var tbody = document.querySelector('[data-download-table]');
	if (!tbody) return;
	tbody.replaceChildren();

	function button(t, ext, primary) {
		var cls = 'btn btn-sm ' + (primary ? 'btn-primary' : 'btn-outline-primary');
		return el('a', { class: cls, href: downloadUrl(t.id, ext), title: assetName(t.id, ext) }, ['.' + ext]);
	}
	function none(title) {
		return el('span', { class: 'text-secondary', title: title }, ['—']);
	}

	TARGETS.forEach(function (t) {
		var installerCell = t.installers.length
			? el('div', { class: 'd-flex flex-wrap gap-1' }, t.installers.map(function (ext) { return button(t, ext, true); }))
			: none('No installer is published for this platform yet; use the .jar.');
		var portableCell = t.portable
			? button(t, t.portable, false)
			: none('No portable build is published for this platform yet; use the .jar.');

		tbody.appendChild(el('tr', null, [
			el('th', { scope: 'row', class: 'fw-normal' }, [t.label]),
			el('td', null, [installerCell]),
			el('td', null, [portableCell]),
			el('td', null, [button(t, 'jar', false)]),
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
	var target = findTarget(detectTarget());
	fillReleaseLabels();
	setupPrimaryButtons(target);
	selectInstallTab(target);
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
		checksumsSignatureUrl: checksumsSignatureUrl,
		detectTarget: detectTarget,
		primaryExt: primaryExt,
	};
}
