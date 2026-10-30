# V9.1.1 Progress Shield — format, recovery and verification

This feature does not recalculate XP, levels, ranks, characteristics, rewards or inventory unlocks. Existing profile keys are unchanged. No automatic migration or production publication is performed by this change.

## V9.1.1 export behavior and evidence

The previous implementation relied on a Blob anchor click; Telegram Android may ignore it. File sharing is a separate Web Share capability, not guaranteed by the Telegram SDK. Copying through Samsung Notes can change or truncate JSON; renaming the extension cannot repair the content. The reported Notes file was not supplied, so its exact corruption has not been diagnosed.

The official [Telegram Mini Apps documentation](https://core.telegram.org/bots/webapps#downloadfileparams) specifies an HTTPS URL for `downloadFile` (Bot API 8.0+). Its callback confirms acceptance of the download request, not persistence. `shareMessage` requires a bot-prepared message. Neither is a local-file export API; this implementation deliberately calls neither and never uploads backups. Web Share is offered only after checking File construction, `navigator.share` and `navigator.canShare({files})`, including exceptions. Sharing runs only on an explicit tap; the chosen target may transmit data, so choose a trusted local destination.

Serialization now checks the generated JSON envelope and exact raw-value roundtrip before any transport. Normal backups pass the existing importer too. Damaged profile roots remain exportable for rescue with an explicit warning that normal import will reject them. Format version 1 and all profile storage shapes remain unchanged. A UTF-8 BOM on imported text is accepted; quotes, prefixes or truncated content are never guessed or repaired.

Local text is always selectable, including when Blob, File, clipboard, download and share APIs are absent or fail. Read-back verification checks saved files and pasted copies against the exact exported snapshot without restoring. A clipboard acknowledgement or completed share promise never claims that a permanent backup exists. Switching to Chrome does not transfer Telegram localStorage.

Validation for this release uses only fictional profiles. Commands:

```sh
node --test tests/*.test.cjs
node tests/browser-progress-shield.cjs
node tests/browser-historical-compatibility.cjs
node tests/browser-backup-export.cjs
```

Playwright must be installed and Chromium available (`CHROMIUM_PATH` overrides `/usr/bin/chromium`). The historical suite optionally accepts `MONARCH_V90_DIR` as described below. The added browser suite covers 320/360/412px layouts and nine mocked host scenarios: missing APIs, denied clipboard/download, throwing canShare, file sharing, share cancellation/failure, file picker/readback/cancellation and missing Blob/File. It verifies full JSON, altered-copy rejection, file read-back, text preview/cancel/restore/rollback, exact raw values and no outbound backup requests. These are Chromium simulations. **A physical Android device running Telegram has not been tested; Android export is not certified by these results.**

Run results (2026-10-30): **55/55 Node tests passed**; all existing mobile Progress Shield integration checks passed; all **26 historical profile shapes** passed differential V9.0/current browser checks; all **9 added host-API scenarios passed**. Browser page-error checks passed. The V9.0 comparison used source files fetched from the pinned commit via the GitHub connector and `MONARCH_V90_DIR`, because this workspace was populated from repository files without older Git objects.

## Complete backup

Evolution → **Exportă backup complet** exports keys in this browser origin starting with `monarch-`, excluding the internal recovery journal `monarch-progress-shield-v1`. This includes:

- `monarch-life-v1`: main progress, Hunter XP, history, Academy, prompt course, journals, settings.
- `monarch-awakening-v2`: questionnaire, campaign completions, Skill XP, directions, avatar.
- `monarch-planner-v25`: goals, active lesson, completions, notes, skills, difficulty and reports.
- `monarch-hunter-equipment-v23` and `monarch-hunter-equipment-v24`.
- `monarch-awakening-previous-backup`, when present, as an opaque archive. It is never executed; a malformed archive raises an inspection warning without blocking the active profile or its export/import.
- Future/unknown `monarch-` keys, preserved as opaque strings.

Other applications' keys are excluded. Raw strings, including whitespace, unknown fields and even corrupt source values, are exported without normalization. A backup containing corrupt recognized data can be archived, but cannot be imported until its structure is valid. Nothing is silently repaired.

Format:

```json
{
  "format": "monarch-system-backup",
  "formatVersion": 1,
  "exportedAt": "2026-10-30T00:00:00.000Z",
  "keys": ["monarch-life-v1"],
  "data": {
    "monarch-life-v1": "{\"xp\":0,\"tasks\":[],\"history\":[],\"bosses\":[]}"
  }
}
```

The keys manifest must match the data exactly. The example represents only the main profile; real exports include all profile keys that exist. Files over 10 MiB, unsupported versions, malformed JSON, invalid known schemas and foreign keys are rejected. Missing optional historical fields are not filled in or written back. Validation follows V9.0 loader defaults: main XP/tasks remain required, but history/bosses and the other nullish-initialized collections may be absent/null. Awakening may omit merged questionnaire defaults; planner collections and equipment slots may use their historical fallbacks. Finite numeric strings are accepted only in the Skill XP/difficulty fields whose V9.0 readers already coerce numbers. Schema versions 1–4 are retained verbatim. Unknown MONARCH fields and future keys are retained. Valid historical empty module objects are distinct from a malformed envelope or an empty backup data map. Inspection and import preview warn about defaulted fields; replacing an entire key still replaces its existing contents rather than merging them.

Legacy main JSON exports and Awakening profile exports are also recognized. Their previews explicitly identify them as partial backups. The old main-only export remains available, and its import action now goes through Progress Shield. An old main backup without history/bosses is accepted when XP/tasks are valid, because V9.0 supplies those optional collections in memory.

## Safe import

1. Parse and validate the entire file before any storage write.
2. Show the keys, data categories, main XP and date; identify existing keys that will remain unchanged.
3. Require the explicit checkbox and confirmation dialog. Closing the preview does not write anything.
4. Compare current storage with the preview snapshot; reject if it changed.
5. Write and read back a durable recovery journal containing the complete current raw profile and the list of affected keys, with status `pending`.
6. Write only the keys present in the imported file, preserving raw strings. Do not clear localStorage, delete unrelated keys, merge histories, normalize saves or award XP.
7. Verify every write, mark the operation `complete`, then reload so all modules read the restored profile.

The journal is a new internal key, not a renamed profile key. It contains the **most recent** pre-operation checkpoint, including the checkpoint before a questionnaire retake. Export it via **Recuperează copia anterioară → Exportă copia anterioară** if it must be retained before another operation. It is excluded from full exports to avoid recursively embedding prior checkpoints. Its backup snapshot is independently downloadable as a normal complete-backup envelope.

## Failure and recovery

- Failure to store the checkpoint (including quota exceeded) occurs before profile writes.
- If a profile write fails, Shield attempts to restore the original values of all affected keys.
- If rollback also fails, `pending` remains durable. On the next page load, Shield runs before all four active application modules and blocks their initialization. A recovery dialog lets the user export current and previous data and explicitly retry recovery.
- Recovery changes only keys touched by that operation. It removes only keys newly introduced by that same operation and absent beforehand; unrelated and pre-existing unknown keys are untouched.
- A rollback itself first records `pending`, so an interrupted rollback remains recoverable.
- **Recuperează copia anterioară** also allows explicit undo after a successful operation. It warns that newer changes to affected keys would be replaced. It does not roll back unrelated keys.
- Corrupt recognized saves stop normal startup before legacy default-state code can overwrite them. They can be exported and replaced by an explicitly confirmed valid import.
- Storage read failures or a malformed recovery journal also stop startup. A corrupt internal journal is not automatically discarded; export current data and preserve the original journal for assisted recovery.
- If the Shield script fails to load, application modules fail closed; reload without clearing browser data.
- A journal change in another tab blocks further normal interaction there and asks for reload. Close other MONARCH tabs before import/recovery; localStorage still is not a database transaction or a cross-device lock.

## Questionnaire retake

The previous destructive handler is replaced with a preview, optional full export, explicit confirmation and the same verified checkpoint mechanism. Only questionnaire answers, introductory assessment and questionnaire navigation flags restart. Campaign completions, reward flags, Skill XP, avatar/customization and unknown historical fields remain present. Main progress, planner data and equipment are untouched.

Existing directions and their order remain fixed during a retake because campaign reward IDs depend on direction positions. This deliberate restriction is explained in both confirmation and path-selection screens. The retake flag is removed on completion. No reward is granted by retaking the questionnaire. First-time path selection is unchanged.

The legacy CSS hiding the completed campaign dashboard is unchanged by this PR. The existing retake handler is protected even though that dashboard currently has a separate visibility issue. Browser tests invoke that existing control programmatically, then complete the questionnaire through its normal visible controls.

## Tests

All fixtures are fictional, in in-memory stores or isolated browser contexts. No real profile is read.

Node.js 24 (51 passing tests after the compatibility review):

```sh
node --test --test-isolation=none tests/*.test.cjs
for file in *.js tests/*.cjs; do node --check "$file" || exit; done
git diff --check
```

Optional browser integration suite requires Playwright (tested with 1.62.1) and Chromium. With those installed:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/browser-progress-shield.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/browser-historical-compatibility.cjs
```

Node tests cover complete export and raw-string preservation, legacy exports, valid restoration, invalid/incomplete files, quota failure, transient/persistent write failures, interrupted restoration and recovery, retention of unknown keys, changed data after preview, corrupt originals and questionnaire preservation. The V9.0 discipline tests remain included.

Browser tests cover 360px and 412px mobile touch viewports; file download; check-only and invalid-file no-write behavior; preview/cancel/confirmation; full restore and undo; legacy import preview; questionnaire completion with locked directions; startup recovery; corrupt-save protection; Telegram ready/expand via an SDK stub; and unchanged +20 Life Evolution / +35 Academy rewards and inventory rules. These tests do not substitute for testing an actual Android Telegram client. The second browser suite loads the same 26 fictional historical profiles into the actual V9.0 source at commit `28a901e` and the current source, exercises navigation/inventory readers, and verifies identical raw storage plus pre-restore JSON downloads. It requires that base commit in the local Git history, or the exact six source files from that commit in `MONARCH_V90_DIR`. Fixture provenance is recorded in `tests/fixtures/historical-saves.cjs`; the suite distinguishes historical writer shapes from missing/null variants explicitly tolerated by their readers. Android user agent, touch viewport, file sharing and unsupported download/clipboard behavior are simulated, not real-device measurements.

## Telegram verification after review

Do not publish or merge automatically. For an approved test deployment, use the PR branch in an isolated test origin/browser profile. Do not run restoration tests against a real player's profile.

1. Open the test WebApp on Android; verify the resources have `?v=monarch-v911-backup-20261030` and Shield loads before app.js.
2. In Evolution, tap **Verifică datele salvate**. Verify that this does not change the profile.
3. In **Evoluție → Progress Shield**, tap **Exportă backup complet**. There is no floating launcher. Awakening-only export is also located here. In Telegram Android, download does not start automatically: use file sharing if confirmed by `navigator.canShare({files})`, or **Afișează / copiază JSON**. An unsupported share button is hidden and explained. **Încearcă descărcarea JSON** is only an attempt, never proof of saving. Where supported, **Salvează direct în fișier** writes through the file picker and reads back the result. Paste the copied text into the verification field or select the saved file; verification compares the complete exported snapshot without writing storage. Use a plain UTF-8 editor, not Samsung Notes. Alternatively, **Importă JSON din text** accepts the unchanged complete JSON and shows the normal protected restore preview. Emergency export remains in blocked-startup/recovery dialogs so damaged data can still be rescued.
4. On a fictional profile, import that JSON. Inspect the preview, cancel once, then import again and explicitly confirm. Check XP, equipment, goals, difficulty and completed lessons.
5. Open **Recuperează copia anterioară** and verify undo on the fictional profile. Verify the prior checkpoint can also be downloaded.
6. Try an invalid file; ensure the data is unchanged. Confirm dialogs and long key names fit the screen and scroll correctly.
7. If Telegram's embedded client ignores a download, use the sharing or JSON display/copy options **inside that same WebView** to preserve its own local profile. Opening the same URL in Chrome may access a different localStorage profile; do not assume that exporting there backs up Telegram data. A browser cannot certify that a download/share destination actually retained the file.

## Remaining limits

All copies are local until downloaded. Clearing site data, changing origin or losing the device can remove both profile and checkpoint. The additional checkpoint consumes storage; if insufficient, import is refused rather than proceeding without protection. There is one retained local checkpoint, not a backup history. Structural validation is not proof that the file is complete relative to an unknown source device, authentic or semantically correct. Unknown keys are opaque. Existing reward writes outside restore/retake are not made transactional by this stage. Cross-device synchronization and a shared lesson/progress engine remain separate work.

## Compatibility review findings

The first review run reproduced 17 failures in newly added tests: the validator incorrectly required optional/defaulted collections, rejected absent/null fallback equipment and numeric strings tolerated by the old readers, and treated an unused malformed Awakening archive as an active startup failure. The existing source-generated main version 1–4 seeds were accepted; the failing cases were their explicit loader-default variants and partial historical exports. No real user data was used.

The corrected validator preserves the bytes of both the stored and restored saves. Differential browser tests confirm all 26 fixture shapes load under both the real V9.0 base and the PR, without errors or storage mutations. Invalid active JSON/roots and unsafe collection types still block or reject import. Optional fields defaulted by V9.0 raise informational warnings rather than fatal errors. This is compatibility validation, not automatic repair or migration.

Exports occur before any restore in the tests, including from the actual import preview (while confirmation remains disabled), a pending-recovery dialog, and blocked startup with corrupt raw originals. Unsupported Blob download + unavailable clipboard still leaves the entire JSON selectable; the native-file-share simulation checks the exact JSON bytes. Successful Chromium download/share calls are not proof of behavior on a particular Android/Telegram release.

