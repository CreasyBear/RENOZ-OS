# Jobs Maintainer Sprint 23: Project Audio Note Storage Cleanup

## Status

Closed in commit-ready state.

## Issue 1: Audio Note Replacement And Deletion Left Old Audio Objects

### Problem

Sprint 22 made new project audio notes persistent, but the server note lifecycle still did not clean old audio files. Updating an audio note with a new recording replaced `project_notes.audio_data`, and deleting an audio note removed the database row, but both paths could leave the previous audio object in storage.

### Workflow Spine

Project notes dialog/card
-> `useUpdateNote` / `useDeleteNote`
-> `updateNote` / `deleteNote`
-> `project_notes.audio_data`
-> project-file storage object cleanup
-> project note query/cache invalidation.

### Touched Domains

- Jobs project note server functions.
- Jobs project note mutation contracts.
- Jobs maintainer closeout docs.

### Business Value Protected

Audio notes are project evidence. Replacing or deleting one should not leave hidden storage-only audio objects that operators cannot manage from the project and that can accumulate cost or stale project context.

### Scope Constraints

- Do not change note schemas, dialogs, note hooks, query keys, cache invalidation, playback UI, transcription behavior, or storage provider.
- Reuse the project-file storage path extractor because audio recordings are uploaded through the project-file storage boundary.
- Keep storage deletion best-effort after successful metadata mutation.

### Changes

- Added `removeProjectNoteAudioStorageObject` in the notes server function.
- Cleaned previous audio storage after successful audio replacement when the stored URL changes.
- Returned deleted note `audioData` and cleaned the backing audio storage after successful note deletion.
- Extended project note mutation source contracts for replacement/delete cleanup.

### Standards Checked

- Domain ownership: note audio cleanup is owned by the Jobs notes server lifecycle.
- Route/dialog/card -> hook -> server function -> schema/database -> query key/cache policy: preserved; cleanup runs after existing note update/delete mutations.
- Tenant isolation/data integrity: update/delete remain scoped by organization and project; cleanup only extracts owned project-file storage URLs/paths.
- Query/cache policy: unchanged. Existing note mutation hooks still invalidate project notes list, stats, and detail keys.
- UI states/error handling: unchanged. Storage cleanup failures are logged and do not convert successful metadata mutations into operator-facing failures.
- Reviewability: one helper, two server mutation cleanup call sites, one focused contract expansion, and this closeout note.

### Smells Removed

- Old audio storage object left behind after note audio replacement.
- Audio storage object left behind after audio note deletion.

### Deferred

- A storage reconciliation job for audio files orphaned before this sprint remains future maintenance work.
- Transcription integration remains a separate product slice.
- Browser QA was not selected because this is server-side lifecycle cleanup with no intended layout change.

### Gates

- Passed: focused project note mutation/read contracts.
- Passed: focused ESLint on touched Jobs notes server/test files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This fits the standing maintainer goal and the current update that serialized gates are retired from routine closeout evidence.

### Residual Risk

Low to moderate. New replacements/deletes clean owned audio objects best-effort; historical orphaned audio remains possible until a reconciliation slice is added.
