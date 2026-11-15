# Requested palette and audio defaults

The current interface uses the supplied palette through `palette.css`, loaded
after the existing styles. NASA observation images and scientific score/depth
ramps keep their original data meanings.

| Role | Color |
| --- | --- |
| Deep Space / background | `#080D18` |
| Midnight Navy / panels | `#111B2D` |
| Slate Blue / secondary surfaces | `#1C2B45` |
| Signal Blue / controls and data accents | `#3B82F6` |
| Data Cyan / highlights and labels | `#8EC5FF` |
| Mars Amber / Mars and regime caveats | `#D99A52` |
| Primary text | `#F4F7FB` |

Sound effects and music now default to enabled. Audio unlocks on the first real
click, tap or keyboard interaction, respecting browser autoplay policy. Settings
still controls both channels and volume; explicit mute choices are saved.
Restoring interface defaults enables both channels again. Music pauses in
background tabs. This replaces earlier releases' sound-off default.

Chrome policy reference:
[Web Audio autoplay](https://developer.chrome.com/blog/autoplay/#web-audio).

Runtime verification for this update is pending. Automatic approval review
rejected shell inspection/testing because the account reached its usage limit;
the rejection was not a determination that the action was unsafe. Previous
browser reports predate these audio/palette changes and do not verify them.

The focused browser check is `node tests/audio-defaults.cjs`. It covers enabled
defaults, first-interaction playback with a real audio signal, saved mute,
restored defaults and computed palette tokens. The existing experience and
mission tests may also need their earlier sound-off expectations updated.
