# Music Story by Red Ant — Audiovisual Autobiography

A dependency-free, GitHub Pages-ready personal music history: scrolling archive, chaptered timeline and full-screen audiovisual Story / Cinema Mode.

## Main files

- `index.html` — public website structure
- `styles.css` — public visual design
- `app.js` — public timeline / Cinema Mode behavior
- `site-data.js` — **all editable published content**: tracks, chapters, EN/FR interface text and published memories/media
- `editor.html` — private/unlisted site editor
- `editor.css` — editor design
- `editor.js` — editor behavior, local draft, PIN gate and export/import

## Private EDIT SITE

Open:

`editor.html`

On GitHub Pages this becomes:

`https://YOUR-NAME.github.io/YOUR-REPOSITORY/editor.html`

The editor is deliberately not linked from the public navigation and contains a `noindex,nofollow` robots directive.

### First visit

The editor asks you to create a PIN. The PIN is stored as a hash in that browser and is used to lock/unlock the editor locally.

**Important:** GitHub Pages is static hosting. A browser-only PIN is a casual access barrier, not real server authentication. Anyone who knows the editor URL can inspect the page source. For true authenticated administration you would need a server or CMS.

### What the editor can change

**01 / TRACKS**
- add new moments
- edit year, decade, artist, title and media format
- edit remix / label / format metadata
- write original/English archive notes and optional French notes
- reorder or delete entries
- sort the full collection chronologically
- add a published personal memory
- add place/context and age/period
- attach exact YouTube URLs
- attach image / sleeve / flyer URLs

**02 / CHAPTERS**
- add/delete/reorder chapters
- edit chapter number and ID
- edit year ranges
- edit era labels
- edit English and French titles
- edit English and French descriptions

**03 / EN + FR TEXT**
- edit the complete public interface in both languages
- includes the title page, buttons, filters, Story Mode labels, memory labels and footer copy

**04 / PUBLISH**
- export `site-data.js` for the live website
- export a complete JSON backup
- import a previous JSON backup
- import a previously exported `site-data.js`
- reset the private draft back to the currently published data

## Draft and preview workflow

Changes in `editor.html` autosave into `localStorage` in your browser.

Click **PREVIEW SITE** and the normal `index.html` opens using that private draft. This does not change what other visitors see.

When the draft is ready:

1. Open **04 / PUBLISH**.
2. Click **DOWNLOAD SITE-DATA.JS**.
3. Replace the old `site-data.js` in the website/repository with the downloaded one.
4. Commit/push the replacement to GitHub.
5. GitHub Pages publishes the new content.

This means you no longer need to edit `app.js` to add music or change chapters.

## Public EN / FR switch

The **EN | FR** switch is on the opening **MUSIC MADE MY LIFE** title screen at the very top. The selected language is remembered in the browser.

Artist names and track titles remain unchanged. The editor supports optional French versions of archive notes, while all interface and chapter copy can be edited bilingually.

## Public memories are read-only

The public website can **display** personal memories, places, images and video links, but visitors cannot add, edit or delete them. There is no public memory form or editing shortcut.

All memory editing happens only in the unlisted `editor.html`. Memories entered there are stored in the private editor draft and become part of the published autobiography only when you export and replace `site-data.js`.

The editor draft itself still uses browser `localStorage`, which is why **PREVIEW SITE** can show unpublished changes in your own browser. That preview storage is separate from public visitor editing.

## Run locally

You can open `index.html` and `editor.html` directly in a modern browser. For behavior closest to GitHub Pages, a small local web server is preferable, for example VS Code Live Server.

## Publish on GitHub Pages

Upload all of these files to the repository root:

- `index.html`
- `styles.css`
- `app.js`
- `site-data.js`
- `editor.html`
- `editor.css`
- `editor.js`

Then use **Settings → Pages → Deploy from a branch → main → / (root)**.

## Backups

Use **DOWNLOAD JSON** in the editor regularly. The JSON backup contains the complete editable content database and can be re-imported later.
