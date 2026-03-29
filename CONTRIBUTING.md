# Contributing to Satoshi Valley

Welcome to the node farm! Here's how we work together. ⛏️

## 🔀 Branch Workflow

We use a **branch + PR** workflow. Nobody pushes directly to `main`.

### Steps:

1. **Pick an issue** (or create one) — every change should have an issue
2. **Create a branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```
3. **Do your work** — commit often with clear messages
4. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** on GitHub → base: `main` ← compare: your branch
6. **Get a review** — at least one approval before merging
7. **Merge** — squash merge preferred for clean history

### Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/mining-rig-ui` |
| Bug fix | `fix/description` | `fix/crop-growth-timer` |
| Docs | `docs/description` | `docs/update-gdd` |
| Art/Assets | `art/description` | `art/npc-sprites` |
| Prototype | `proto/description` | `proto/day-night-cycle` |

## 💬 Commit Messages

Keep them clear and concise:

```
Add basic mining rig placement system
Fix crop watering animation bug
Update GDD with Lightning Network mechanics
Add NPC sprite sheets for villagers
```

No need for conventional commits (feat:, fix:, etc.) — just be descriptive.

## 🎯 Issues

- Use GitHub Issues for all work — features, bugs, ideas, questions
- Label them: `feature`, `bug`, `art`, `design`, `prototype`, `docs`
- Reference issues in PRs: "Closes #12" in the PR description

## 📁 Project Structure

```
satoshi-valley/
├── assets/          # Art, audio, fonts
├── docs/            # GDD, sprint plans, guides
├── scenes/          # Godot scene files (.tscn)
├── scripts/         # GDScript files (.gd)
├── web/             # Web-related assets
└── project.godot    # Godot project file
```

## 🛠️ Development Setup

1. Install [Godot 4](https://godotengine.org/download)
2. Clone the repo: `git clone https://github.com/Bender21m/satoshi-valley.git`
3. Open `project.godot` in Godot
4. You're in!

## 📋 PR Checklist

Before requesting review:

- [ ] Branch is up to date with `main`
- [ ] Game runs without errors
- [ ] Changes are described in the PR
- [ ] Related issue is referenced
- [ ] No temporary/debug code left in

## 🤝 Code of Conduct

- Be excellent to each other
- Bitcoin only — no shitcoinery 🍊
- Fun first, ego never
- If you break something, fix it or ask for help

---

*21 million sats of gratitude for contributing.* ⚡
