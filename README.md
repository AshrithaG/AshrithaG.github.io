# ashrithag.github.io

Personal site. Plain HTML, CSS and JavaScript. No build step, no framework, no dependencies.
Edit a file, commit, push, and GitHub Pages serves it.

## Layout

```
index.html                  home: hero, publications, projects, experience, toolchain
assets/css/site.css         shared styles + light/dark palette
assets/css/project.css      styles for the write-up pages
assets/js/site.js           theme toggle, nav, scroll bar, project filters
assets/js/project.js        loads and renders the markdown write-ups
projects/projects.html      the shell every write-up renders into
projects/<slug>/<slug>.md   one write-up per project
projects/<slug>/images/     images and video for that project
.nojekyll                   REQUIRED: stops GitHub from processing the .md files
```

## Adding a project

1. `mkdir -p projects/my-thing/images`
2. Write `projects/my-thing/my-thing.md`. It must start with `# Title`.
3. Add a card to `index.html` inside `<div class="grid">`, pointing at
   `projects/projects.html?p=my-thing`.

The slug, the folder, and the filename must all match.

## Writing a write-up

Normal markdown works: headings, `**bold**`, `*italic*`, `` `code` ``, links, images,
bullet and numbered lists, `>` quotes, `---` rules, tables, and ```` ``` ```` code fences.

**Raw HTML also works, with one rule: an HTML block must not contain a blank line.**
That is how the renderer knows where the block ends.

Useful blocks:

```html
<div class="meta"><span><b>Stack</b> PyTorch, CUDA</span><span><b>Role</b> Solo</span></div>

<div class="doclinks"><a class="btn btn--solid" href="URL" target="_blank">Code on GitHub</a></div>

<div class="stats"><div class="stat"><b>0.99x</b><span>caption</span></div><div class="stat"><b>122 TOPS</b><span>caption</span></div></div>
```

## Adding images and video

Put the file in that project's `images/` folder and reference it relatively. Paths are
resolved against the project folder automatically.

```markdown
![Alt text](images/hero.png)
```

```html
<figure><video src="images/demo.mp4" controls muted loop playsinline></video><figcaption>Caption</figcaption></figure>
```

YouTube:

```html
<div class="embed"><iframe src="https://www.youtube.com/embed/VIDEO_ID" allowfullscreen></iframe></div>
```

Every write-up currently has a dashed placeholder box where a hero image should go. Replace
the whole `<div class="ph">...</div>` block with an image, a video, or delete it.

## Card thumbnails

Cards on the home page show a lettered placeholder. To use a real image, replace

```html
<div class="card__media"><div class="card__ph"><b>name</b>hero image or clip</div></div>
```

with

```html
<div class="card__media"><img src="projects/my-thing/images/thumb.png" alt=""></div>
```

A `<video>` instead of `<img>` also works and plays on hover automatically.

## Profile photo

Drop a square image at `assets/img/profile.jpg`, then in `index.html` replace the
`<div class="hero__ph">...</div>` block with:

```html
<img src="assets/img/profile.jpg" alt="Ashritha Gonuguntla">
```

## Running it locally

`fetch()` does not work over `file://`, so the write-ups need a server:

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321

## Note on the template

The information architecture (sticky nav, hero, card grid, markdown-driven detail pages at
`?p=slug`) follows the pattern used by
[vaibhavparekh9.github.io](https://github.com/vaibhavparekh9/vaibhavparekh9.github.io).
The CSS and JavaScript here were written from scratch rather than copied, since that
repository carries no licence.
