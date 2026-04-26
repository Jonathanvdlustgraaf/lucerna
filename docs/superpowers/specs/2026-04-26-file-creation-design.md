# File Creation Design

**Date:** 2026-04-26
**Status:** Approved

## Overview

Add the ability to create a new `.md` file from within Lucerna. Creation can be triggered from two entry points: the FileTree sidebar and the Command Palette. After creation, the file is immediately opened in the editor with edit mode activated.

## Backend

No new endpoints are needed. The existing `PUT /api/files/[...path]` endpoint uses Node's `writeFile`, which creates the file if it doesn't exist. Creating a file is a PUT with `{ content: '' }` on a path that does not yet exist.

The `.md` extension is always enforced on the client — if the user types a name without the extension, `.md` is appended before the PUT is fired.

## FileTree

**Trigger:** A `+` button added to the browse-mode header row, alongside the `..` nav button and path input.

**Flow:**
1. User clicks `+` — an inline input appears at the top of the file list, auto-focused, with placeholder `filename.md`.
2. User types a name and presses Enter to confirm, or Escape to cancel.
3. `.md` is appended if omitted.
4. Client fires `PUT /api/files/<currentPath>/<filename>.md` with `{ content: '' }`.
5. On success: `onselect(newPath, filename)` is called, which triggers `openFile` in Editor, then `editor.toggleEdit()` activates edit mode.
6. The inline input closes and the file list refreshes to show the new file.

The `+` button is only shown in browse mode (not search mode), since the current directory is well-defined in browse mode.

## Command Palette

**Trigger:** A new command registered in Editor: `{ id: 'new-file', label: 'New File', description: 'Create a new markdown file' }`.

**Flow:**
1. User opens the Command Palette (`Ctrl+K`), selects `New File`.
2. The palette switches to a filename-input sub-state: the search field clears and shows placeholder `Enter filename...`.
3. User types a name and presses Enter. Escape cancels and returns to normal palette mode.
4. `.md` is appended if omitted.
5. Target directory is derived from the active file's parent directory. If no file is open, the repo root is used.
6. Client fires `PUT /api/files/<targetDir>/<filename>.md` with `{ content: '' }`.
7. On success: palette closes, file opens, edit mode activates.

## State management

The `CommandPalette` component needs a new internal state: `mode: 'search' | 'newFile'`. This is purely local UI state — no changes to the editor or tools stores are needed.

The FileTree component needs a new local state: `creatingFile: boolean` to show/hide the inline input.

## Error handling

- If the PUT fails (e.g. a file with that name already exists and write fails, or a permission error), show a brief inline error message in the input field.
- Empty filename input: disable confirmation (Enter does nothing).

## What is not in scope

- Creating directories.
- Renaming or deleting files.
- Confirming before overwriting an existing file (the PUT is an upsert — the user is responsible for unique names).
