# Git setup — move out of OneDrive first

Active git repos shouldn't live inside OneDrive: the sync client mangles git's
internal files (`.git/config` gets corrupted) and churns on `node_modules`.
Move the project to a non-synced folder, then version-control it there.

Run in **PowerShell**:

```powershell
# 1. Create a non-synced code folder and move the project there
New-Item -ItemType Directory -Force "$HOME\dev" | Out-Null
Move-Item "$HOME\OneDrive\Desktop\Wedding\wedding-app" "$HOME\dev\wedding-app"
cd "$HOME\dev\wedding-app"

# 2. Initialize git
git init -b main
git config user.name "Val"
git config user.email "valorie811@gmail.com"

# 3. First commit  (node_modules and .env.local are already gitignored)
git add .
git commit -m "Phase 1 foundation: app scaffold, design system, i18n, Supabase schema + auth, dashboard"

# 4. Run it
npm install
npm run dev
```

## Optional: push to GitHub

```powershell
# After creating an empty repo named "wedding-app" on github.com (no README):
git remote add origin https://github.com/<your-username>/wedding-app.git
git push -u origin main
```

## Working with Cowork after the move

The project is now outside the OneDrive folder Cowork is pointed at. To have
Claude continue building (Phase 2), select `C:\Users\valor\dev\wedding-app` as
the Cowork working folder. Claude edits the files there; you run `git` commands
in your own terminal (native git handles a normal local folder fine).
```
