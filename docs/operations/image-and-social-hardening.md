# Image screening and social fixes, 1 October 2026

## Image screening

The server previously classified one stretched 224 by 224 RGB image. A colour
cast, reduced contrast, or adult content occupying only one part of a panorama
could change that one prediction. The browser check remains advisory.

`server-image-views.ts` now derives bounded views from the final published
bytes: full colour, normalized contrast with mild sharpening, monochrome with
normalized contrast, and a central square crop. Wide and tall images receive
two additional end crops. Each view is classified sequentially, and the first
sensitive verdict ends the check. A negative verdict requires every view to
complete. Invalid model predictions or processing failures refuse publication
through the existing upload error handling.

The existing Porn and Hentai thresholds remain 0.5 and Sexy remains 0.9. The
combined Porn plus Hentai probability also flags at 0.65, covering probability
split between explicit photography and explicit drawing. This is a moderation
policy, not an accuracy estimate. The queue, concurrency limits, pixel limit,
and tensor disposal still apply. Screening does not change the published
image or trust a client hash or client prediction.

Using the real MobileNetV2 model on this Windows development machine, the site
logo took 4159 ms on its first call, including model loading. Tinted and blurred
variants took 2871 ms and 2869 ms after loading. All three remained non-sensitive.
The tensor count stayed at 267 across subsequent calls. These are safe control
images, not a benchmark of explicit-content recall or adversarial robustness.

At the time of the first release, specific evasion samples had been requested
but had not yet been supplied. The follow-up below records the supplied example.
These changes add independent views; they do not establish that every reported
evasion is caught. Sharpening cannot restore information removed by severe blur.
Reports and moderation remain necessary. See the upstream
[NSFWJS documentation](https://github.com/infinitered/nsfwjs) and
[Sharp image operations](https://sharp.pixelplumbing.com/api-operation/).

### Follow-up: supplied adult-image regression

A supplied image reproduced a miss on the full image and avatar bytes. The
avatar's first view assigned Sexy 0.422414, Porn 0.354789, and Hentai 0.196991.
The adult sum was 0.974194, but no individual category crossed its threshold
and the explicit-only sum stayed below 0.65. The banner encoding already tripped
the explicit sum. This was a decision-policy gap across categories.

The shared browser and server policy now also flags a total of at least 0.9
across Sexy, Porn, and Hentai, returning `Adult` when no individual or explicit
rule applies. Existing individual limits and the explicit-only sum remain.
Suggestive scores with substantial Neutral or Drawing confidence still pass.
This policy uses combined model confidence, not a calibrated accuracy claim.

The real server classifier flagged the supplied image, a blue colour cast,
Gaussian blur with sigma 3, and their combination. Each was exercised on its
source bytes and on avatar and banner normalization. The local regression also
checks the exact WebP encodings used by screenshots and journal images. The site logo remained
non-sensitive in all three contexts. This establishes those measured cases,
not universal resistance to image editing.

`server-image-screening-regression.test.mts` repeats these checks locally when
`ULOGGD_NSFW_REGRESSION_IMAGE` names an operator-supplied file. The image is not
committed or transmitted by this test. Without a supplied file, this single test
is explicitly skipped; the measured probability regression always runs.
Automatic approval rejected an attempted upload-endpoint test because a missed
verdict could send the sample to the external image provider. That test was
removed. Safe-image browser tests cover the publication flow separately.

### Follow-up: screenshot links and visitor folders

The home screenshot's game title was already a game link. Its author, likes,
and comments were plain spans. The author byline now opens the profile with
lilac hover feedback; counts link to the screenshot and its comments.

Visitor list pages did not fetch folders, discarded the folder query, and
hid the folder bar. They now use the same filters as the owner with editing
disabled. The public profile folder endpoint uses the existing row policies
and returns only folders containing lists that the reader may see, counting
only those lists. Followers also see folders containing follower-only lists.
Private-only and empty folders remain hidden from visitors. Private profile
and block restrictions are checked by the existing profile reader.

The shared folder reader also counts unfiled lists directly. Subtracting the
sum of folder sizes from all lists undercounted unfiled lists whenever a list
belonged to multiple folders. No database policy or schema change was needed.

## Bans and lost follows

The active `moderate_profile` function explicitly deleted every follow edge
touching the banned profile. Its follow notification trigger also deleted the
matching notifications, removing a possible source of recovery evidence.

Migration `20261001000100_preserve_follows_on_ban.sql` recreates the current
function with that deletion removed. Warnings, reasons, actor permissions,
temporary and permanent bans, moderation notices, verification, and the audit
trail are retained. Existing mutation guards and page authentication continue
to enforce suspension. Both follow directions and their original timestamps
survive ban and unban.

The requested account currently has two followers and follows one account.
Read-only inspection found no follow history or deleted-edge archive. Existing
follow notices describe the current edges; moderation metadata contains only
the sanction and duration. No relationship was invented or restored. Recovering
deleted edges requires an independently verified backup from before the ban,
with later unfollows and blocks checked before restoring individual edges.

The migration was first exercised inside a rolled-back transaction. It was
then applied through the repository migration runner. The permanent regression
test exercises the installed function, both ban durations, exact edge equality,
blocked writes while banned, and ordinary writes after reinstatement.

## Mineral notifications

The database already emitted `mineral_transfer`. The notification UI omitted
that kind from its own type and used list-like text and the heart icon as a
default. The API also had no wallet destination for that kind.

The UI now shares the push notification kind type, presents a gem and localized
mineral transfer copy with the amount, and uses neutral copy for unknown kinds.
The API resolves the recipient's own wallet. Existing historical transfer
notifications are corrected when read; no data rewrite is necessary.

## Interface behaviour

- Normal buttons retain the shared hover contour. Likes and image cover
  controls opt out and retain their own semantic state. Cover selection shows
  its selected frame without adding a hover frame around each option.
- Underlined text links share the lilac accent, including game company credits.
- Numbered pagers, jumps, and server or shallow previous/next links scroll to
  the top on activation. Modified clicks and browser history keep normal browser
  behaviour. Loading more items does not reset scroll.
- The game cover opens the same image viewer as profile photos and media, with
  original image access, zoom, Escape, and restored keyboard focus.
- The list item mark trigger uses the shared Base UI tooltip. Source inspection
  and a regression test reject native hint `title` attributes on HTML controls
  and UI triggers. Embedded iframe titles are retained as accessible document
  names; component title props name headings and dialogs.

## First-release validation

The final required gates passed: `npx tsc --noEmit`, `npx eslint .`,
`npm run test:unit` (360 passed, no failures or skips), and the normal
`npm run build` using Next.js 16.3.8 and Turbopack.

Built browser tests run one spec at a time, clearing port 3100 before each run,
with one worker. The image upload tests use real server inference on safe
original, colour-edited, and blurred controls. The mineral test uses a real
transfer between throwaway accounts and checks Portuguese, English, and Spanish
copy, the icon, wallet link, and rendered wallet history.

| Built spec | Projects | Passed | Skipped |
| --- | --- | ---: | ---: |
| `control-feedback.spec.ts` | Desktop and mobile Chromium | 8 | 0 |
| `mineral-notifications.spec.ts` | Desktop and mobile Chromium | 2 | 0 |
| `list-marks.spec.ts` | Desktop and mobile Chromium | 6 | 2 |
| `search.spec.ts` | Desktop and mobile Chromium | 31 | 3 |
| `image-upload-screening.spec.ts` | Desktop and mobile Chromium | 2 | 0 |
| `profile-image-screening.spec.ts` | Desktop and mobile Chromium | 2 | 0 |
| `moderation.spec.ts` | Desktop and mobile Chromium | 22 | 0 |
| `signed-in-flows.spec.ts`, repeated four times | Desktop Chromium | 24 | 0 |
| `api-only-browser.spec.ts` | Desktop Chromium | 4 | 0 |
| `journal.spec.ts` | Desktop Chromium | 6 | 0 |

These final built runs passed 107 tests with five existing skips. The installed
ban preservation regression also passed after applying the migration; the full
database suite passed 192 tests with no failures or skips earlier in this change.

The five skips are existing viewport-specific cases. An earlier short search
selector also selected `list-editor-search.spec.ts` and passed 37 tests with
three skips. Search was rerun with its full file path to satisfy separate-spec
validation; that exact run is the one reported above.

The first tooltip assertions failed because they expected a `tooltip` role.
The installed Base UI version implements a visual hint with an accessible label
on the trigger. The final test checks the actual open popup and its text after
establishing hydration through a real interaction. The first monochrome unit
check found a one-channel buffer; encoding and decoding the intermediate PNG
now ensures the model receives three-channel RGB. The mineral regression was
also strengthened to wait for rendered wallet history and reject browser page
errors before deleting its accounts, rather than stopping at the destination
URL.

## Follow-up validation

The follow-up required gates passed: typecheck, full ESLint, and 362 unit tests
with no failures or skips locally, including the supplied-image regression with
all publication encodings. The normal production build also passed. CI has no
access to the supplied image, so it explicitly skips that one local-image test;
the fixed-probability policy regression runs in CI.

Built browser tests ran separately with one worker and port 3100 cleared before
each invocation, on desktop and mobile Chromium:

| Spec | Passed | Skipped |
| --- | ---: | ---: |
| `list-folders.spec.ts` | 12 | 0 |
| `discovery.spec.ts` | 24 | 0 |
| `profile-image-screening.spec.ts` | 2 | 0 |
| `image-upload-screening.spec.ts` | 2 | 0 |

The folder regression checks anonymous and signed-in visitors, private-only
and empty folders, permitted counts in mixed folders, a list in two folders,
the unfiled filter, reload and direct folder URLs, refused visitor edits, and
follower-only folders appearing after following and disappearing after unfollowing.
The home regression checks the author link's navigation, lilac in both themes,
and screenshot and comment destinations. Upload tests use only safe controls.

Extending the visitor case to followers exposed an additional mismatch: the
legacy `/api/lists` read pinned visitors to PUBLIC even after the server page
and folder counts included follower-only lists. That first expanded run failed
in both browser projects. The legacy read now uses ALL for visitors under the
existing row policies, matching the server page and folder filtering.
