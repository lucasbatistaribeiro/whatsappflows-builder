---
name: release
description: Cut a tagged release of the plugin — bump the version through a PR, tag it, build and zip the plugin/ folder, publish a GitHub release and verify the published asset. Use when the user asks to release, publish, ship, cut a version, or "gerar uma nova versão".
---

# Releasing the plugin

The deliverable is the `plugin/` folder, and its two bundles are gitignored — so
a release without a zip attached gives nobody a runnable plugin. The whole point
of this ritual is that zip and the proof it is the real one.

## Before anything

- `git status` must be clean and `main` level with `origin/main`.
- **Never push to `main`.** The version bump goes through a PR like any change.
- Check what landed since the last tag: `git log --oneline $(git describe --tags --abbrev=0)..main`

## 1. Pick the version

Semver against what actually shipped:

- **minor** — a new feature (every `feat/…` PR so far has been one).
- **patch** — fixes, or documentation only.
- **major** — only if a flow authored in an older version stops loading.

Docs-only is worth a word of honesty: the bundles come out **byte-identical**,
so say in the notes that anyone already on the previous version has nothing to
update and the tag exists to match the repository state.

## 2. Bump, through a PR

```bash
git checkout -b chore/release-X.Y.Z
# edit "version" in package.json
git commit -am "Release X.Y.Z"
git push -u origin chore/release-X.Y.Z
gh pr create --title "Release X.Y.Z" --body "…"
gh pr merge <n> --squash
git checkout main && git pull --ff-only
git push origin --delete chore/release-X.Y.Z && git branch -D chore/release-X.Y.Z
```

`manifest.json` has **no** version field — Figma doesn't define one, and an
unknown key there is a manifest error. The version lives in `package.json` and
the tag only.

## 3. Build from the merged `main`

```bash
npm run typecheck && npm run build
```

Both must be green, and `git status` must still be clean afterwards.

## 4. Zip the plugin folder

Windows — `zip` is not on PATH, use PowerShell. The zip gets a **top-level
folder** so it doesn't explode into the user's Downloads:

```powershell
$s = "<scratchpad>\release-X.Y.Z"
New-Item -ItemType Directory -Force "$s\whatsapp-flows-builder" | Out-Null
$p = "<repo>\plugin"
Copy-Item "$p\manifest.json","$p\code.js","$p\ui.html" "$s\whatsapp-flows-builder\"
Compress-Archive -Path "$s\whatsapp-flows-builder" -DestinationPath "$s\whatsapp-flows-builder-X.Y.Z.zip" -Force
```

Build it in the scratchpad, never inside the repo.

## 5. Tag and publish

```bash
git tag -a vX.Y.Z -m "WhatsApp Flows Builder X.Y.Z" <release commit>
git push origin vX.Y.Z
gh release create vX.Y.Z "<zip>#Plugin (manifest.json + code.js + ui.html)" \
  --title "WhatsApp Flows Builder X.Y.Z" --notes "…"
```

Notes that earn their place: what changed and **why it matters to someone using
the plugin**, the install steps (unzip → Plugins → Development → Import plugin
from manifest…), the upgrade line (replace the three files and reload — the
manifest is unchanged, so nothing to re-import), any caveat worth knowing, and
the `compare/vPREV...vX.Y.Z` link.

## 6. Verify the published asset — do not skip this

Download what GitHub actually serves and prove it is the plugin you built:

```powershell
gh release download vX.Y.Z --dir <tmp>
Expand-Archive "<tmp>\whatsapp-flows-builder-X.Y.Z.zip" -DestinationPath "<tmp>\out"
# manifest parses, main/ui resolve next to it, and:
Get-FileHash "<tmp>\out\whatsapp-flows-builder\code.js" -Algorithm SHA256
Get-FileHash "<repo>\plugin\code.js" -Algorithm SHA256   # must match
```

Also grep the extracted bundle for a string from the feature you just shipped —
it catches a stale build faster than anything else.

## 7. Report

The release URL, the two merge commits, what the version step was and why, and
anything that is still unverified (anything in `src/main` can only be confirmed
inside Figma — say so rather than implying the release was exercised there).

## Known loose ends

GitHub always attaches **Source code (zip/tar.gz)** to a tag-based release and
there is no way to remove or hide them. If the whole-repo download is a problem,
the only real answer is publishing releases from a separate distribution
repository.
