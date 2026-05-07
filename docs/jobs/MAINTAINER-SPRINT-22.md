# Jobs Maintainer Sprint 22: Project Audio Notes Persistence

## Status

Closed in commit-ready state.

## Issue 1: Recorded Project Audio Notes Were Not Persisted

### Problem

Project note create/edit dialogs could access the microphone and capture audio chunks, but create inserted `[Audio recording attached]` into the text body without saving the audio file, and edit captured a blob without persisting it. The project notes card also rendered a simulated player that never used the stored `audioData.fileUrl`.

### Workflow Spine

Project notes dialog
-> browser media recording
-> scoped project-file storage upload
-> `createNote` / `updateNote`
-> `project_notes.audio_data`
-> project notes list query/cache invalidation
-> audio note card playback.

### Touched Domains

- Jobs project note create/edit dialogs.
- Jobs project notes card audio player.
- Jobs project note mutation contracts.
- Jobs maintainer closeout docs.

### Business Value Protected

Voice notes are useful for site observations, service context, warranty follow-up, and quick operator capture. Recording audio should create a retrievable project note, not only a text placeholder or a transient browser blob.

### Scope Constraints

- Do not change project note schemas, server note CRUD, query keys, cache invalidation, transcription processing, or storage provider.
- Reuse the scoped project-file upload and rollback actions from the project-file storage boundary.
- Keep transcription honest: persist an audio file and empty transcript rather than pretending transcription exists.

### Changes

- Converted recorded audio blobs into `File` objects and uploaded them through `uploadProjectFile`.
- Persisted `audioData` with `fileUrl`, `fileName`, duration, empty transcript, and explicit transcription-unavailable summary.
- Forced note type to `audio` when a recording is attached.
- Rolled back uploaded audio objects if note create/update fails after upload.
- Replaced the simulated notes audio player with a native audio element bound to `audioData.fileUrl`.
- Removed placeholder text and non-persistence comments from note recording paths.

### Standards Checked

- Domain ownership: audio note capture remains in Jobs note dialogs and reuses Jobs project-file storage ownership.
- Route -> tab/dialog -> hook -> server function -> schema/database -> query key/cache policy: preserved; only mutation payloads and playback rendering changed.
- Tenant isolation/data integrity: audio upload runs through authenticated project verification in `uploadProjectFile`; rollback uses owned-path validation.
- Query/cache policy: unchanged. Existing note create/update hooks still invalidate project notes list, stats, and detail keys.
- UI states/error handling: existing `formatProjectNoteMutationError` remains the operator-facing create/update failure boundary.
- Reviewability: dialog upload/payload changes, card playback fix, focused contract expansion, and this closeout note.

### Smells Removed

- Fake `[Audio recording attached]` note content.
- Edit recording path that captured but did not persist audio.
- Simulated audio player that did not use stored audio URLs.

### Deferred

- AI transcription integration remains a future slice.
- Replacing old audio files when editing an existing audio note remains a future storage cleanup slice.
- Browser QA was not selected because this is a focused persistence/playback contract change; manual microphone QA still remains useful before relying on the workflow operationally.

### Gates

- Passed: focused project note mutation/read contracts.
- Passed: focused ESLint on touched Jobs notes files and tests.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This fits the standing maintainer goal and the current update that serialized gates are retired from routine closeout evidence.

### Residual Risk

Moderate. New audio notes persist and play stored audio, but real transcription and old-audio replacement cleanup remain separate workflow slices.
