# DeLab Property Groups

## Group Mapping

| Group | Property | Label (UI) | Source |
|---|---|---|---|
| Size | `width` | `width` | |
| Size | `height` | `height` | |
| Layout | `display` | `display` | |
| Layout | `flex-direction` | `flex-dir` | |
| Layout | `justify-content` | `justify` | |
| Layout | `align-items` | `align-items` | |
| Layout | `gap` | `gap` | |
| Spacing | `margin` | `margin` | Shorthand merged from margin-top/right/bottom/left |
| Spacing | `padding` | `padding` | Shorthand merged from padding-top/right/bottom/left |
| Color | `color` | `color` | Converted to Hex; toggle via group dropdown (Hex / RGB / HSL) |
| Color | `background` | `background` | Converted to Hex; toggle via group dropdown |
| Color | `border-color` | `border-color` | Only shown when border is visible |
| Typography | `font` | `font` | Actual rendered font (detected from font-family) |
| Typography | `font-size` | `font-size` | |
| Typography | `font-weight` | `font-weight` | |
| Typography | `line-height` | `line-height` | |
| Typography | `letter-spacing` | `letter-sp` | |
| Typography | `text-align` | `text-align` | |
| Border | `border` | `border` | Shorthand merged from border-width/style (color excluded) |
| Shape & Effect | `opacity` | `opacity` | |
| Shape & Effect | `border-radius` | `radius` | |
| Shape & Effect | `box-shadow` | `box-shadow` | |

## Empty Value Filter

When "Show all" is off, the following values are hidden:

- `0px`, `0`, `none`, `normal`, `auto`, `static`, `start`, `row`, `1`
- `#00000000`, `transparent`

---

# Changelog

## v0.1.0 — MVP

### Architecture
- Chrome Extension Manifest V3
- TypeScript + Webpack, no framework dependencies
- Floating panel (inline on page) and side panel (devtools-style) dual mode
- JetBrains Mono font throughout
- Light / dark theme support
- Icons powered by [Lucide](https://lucide.dev)

### Feature Summary
| Feature | Detail |
|---|---|
| **Element Inspection** | Click any element to lock and inspect CSS properties |
| **Property Groups** | 8 groups: Size, Layout, Spacing, Color, Typography, Border, Shape & Effect |
| **Shorthand Merging** | `margin` / `padding` / `border` auto-merged from individual sides |
| **Font Detection** | Rendered font-family resolved via `document.fonts.check` + canvas fallback |
| **Color Preview** | Inline color swatch with light-color border hint |
| **Color Format** | Default Hex; Color group has dropdown to switch all values to Hex / RGB / HSL |
| **Copy** | Click any property row to copy `property: value`; value text replaced with "Copied" for 1.2s |
| **Show All Toggle** | Checkbox to reveal empty/default values |
| **Draggable Panel** | Floating panel can be dragged and resized; position persisted in localStorage |
| **Element Info** | Tag name, `#id`, `.class` displayed above properties |

### UI / UX Decisions
- Label abbreviations for long property names (`flex-dir`, `justify`, `letter-sp`, `radius`)
- No group collapsing or count badges
- Tag name shown as outline badge (not solid fill)
- Esc key does NOT close the panel (close via panel button only)
- Color values stored as Hex internally; dropdown switches display format for entire group
