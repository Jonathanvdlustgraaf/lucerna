# Lucerna

A git-native markdown editor with a spotlight-first design. Minimal by default, powerful on demand.

The name comes from the Latin word for a portable oil lamp.

## Quick Start

```bash
# Clone and install
git clone https://github.com/Jonathanvdlustgraaf/lucerna.git
cd lucerna
npm install

# Point to a markdown repo
cp .env.example .env
# Edit .env: set REPO_PATH to your git repo

# Run
npm run dev
```

## Features

- **Git-native** - reads, writes, commits, and pushes to any markdown repo
- **Spotlight mode** - configurable focus window that fades surrounding context
- **Summon, don't display** - every tool is hidden until invoked by shortcut
- **Export** - PDF and Word with Dutch business document templates
- **Dark theme** - warm amber accent on a dark canvas

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) with Node adapter
- [simple-git](https://github.com/steveukx/git-js) for git operations
- [Sora](https://fonts.google.com/specimen/Sora), [Inter](https://rsms.me/inter/), [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (self-hosted)

## License

MIT
