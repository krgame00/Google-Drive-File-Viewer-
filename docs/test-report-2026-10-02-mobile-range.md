# Mobile range failure investigation

## Observed symptom

The supplied Brave Android screenshot reports streamRangeUnsupported, followed by manual whole-file loading in another screenshot. This identifies the service worker's range-validation path; M0/N2/R0 alone does not establish a codec failure.

## Live checks

The user supplied a new reference clip. Requests read at most 4 KiB of each response, then aborted; no OAuth token or video content was logged. The public Worker and official Google API were checked without an account session.

| Route | Requested range | Result |
| --- | --- | --- |
| Google usercontent | 0–4095 | 206 video/mp4, matching interval |
| Google usercontent | 0–8388607 | 200 HTML confirmation page |
| Existing public Worker | 0–4095 | 206 video/mp4, matching interval |
| Existing public Worker | 0–8388607 | 206 video/mp4, matching interval |
| Google media API with the app's existing key | Both intervals | 403 JSON |

The known file length was 1,828,606,549 bytes. Small samples do not prove sustained playback. No signed-in bearer response from the phone was captured, so the exact mobile range-rejection cause remains unconfirmed. A 403 alone does not distinguish quota from permission or key restrictions.

## Confirmed code issue

The local service worker and public Worker rejected a valid 206 Content-Range when total size was unknown (`bytes 0-3/*`). Regression tests reproduced 502, then passed after accepting the wildcard total. Known totals must still exceed the returned end. HTTP 200, malformed headers, wrong starting offsets, inverted ranges and intervals exceeding the requested cap remain rejected.

Unknown complete lengths are permitted by [RFC 9110 section 14.4](https://httpwg.org/specs/rfc9110.html#field.content-range). This correction has not been shown to be the cause of the supplied screenshot.

The service worker now sends only an allowlisted rejection category and upstream status; the UI validates both before rendering a RANGE diagnostic. No raw header, token or media URL is included. Deploying the changed Cloudflare source is separate from publishing the frontend.
