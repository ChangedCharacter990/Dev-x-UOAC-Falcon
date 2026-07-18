#!/usr/bin/env python3
"""Fetch + process LPC sprites into popup-ready layer PNGs.

Downloads layer sheets from the Universal LPC Spritesheet Character Generator
repo, crops the front-facing idle frame, recolors via the repo's own palette
ramps (exact-color swap), and writes 64x64 PNGs into public/sprites/.

Run from avatar-app/:  python3 scripts/fetch_lpc_assets.py
Requires: Pillow, network access. Output PNGs are committed, so teammates
never need to run this unless changing the asset set.

Art: Liberated Pixel Cup assets, CC-BY-SA 3.0 / GPL 3.0 — see the generated
public/sprites/ATTRIBUTION.md.
"""

import csv
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

REPO = "LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator"
RAW = f"https://raw.githubusercontent.com/{REPO}/master"

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sprites"
CACHE = ROOT / "scripts" / ".lpc_cache"

# We crop the standing frame from walk.png (column 0, south row) rather than
# idle.png: walk is the one animation every asset ships (e.g. the collared
# jacket and chain necklace have no idle), and walk frame 0 is the canonical
# standing pose. Sheets are 4 rows of 64px ordered north/west/south/east.
ANIMATION = "walk.png"
FRAME = (0, 128, 64, 192)

SKIN_TONES = ["light", "amber", "olive", "bronze", "brown", "black"]
HAIR_COLORS = ["raven", "dark_brown", "blonde", "ginger"]
HAIR_STYLES = [
    "plain",
    "buzzcut",
    "afro",
    "curly_short",
    "dreadlocks_short",
    "long_straight",
    "spiked",
    "cornrows",
]

BODIES = {
    "male": {"clothes_fit": "male", "legs_fit": "male"},
    "female": {"clothes_fit": "female", "legs_fit": "thin"},
}

# slot -> garment spec. "template" is a path with {fit} (or a per-body dict of
# templates); "color" is a cloth-palette recolor or None; "bodies" limits which
# body types get the slot (default: all). A fallback chain of fits is tried
# since coverage varies per garment.
TIER_GARMENTS = {
    "poor": {
        "shirt": {"template": "spritesheets/torso/clothes/sleeveless/sleeveless/{fit}/" + ANIMATION, "color": "bluegray"},
        # pants are custom-drawn cardboard (see draw_cardboard_pants); no shoes — barefoot
    },
    "average": {
        "shirt": {"template": "spritesheets/torso/clothes/shortsleeve/tshirt/{fit}/" + ANIMATION, "color": "blue"},
        "pants": {"template": "spritesheets/legs/pants/{fit}/" + ANIMATION, "color": "navy"},
        "shoes": {"template": "spritesheets/feet/shoes/basic/{fit}/" + ANIMATION, "color": "brown"},
    },
    "successful": {
        "shirt": {"template": "spritesheets/torso/clothes/longsleeve/longsleeve/{fit}/" + ANIMATION, "color": "forest"},
        "pants": {"template": "spritesheets/legs/pants/{fit}/" + ANIMATION, "color": "charcoal"},
        "shoes": {"template": "spritesheets/feet/shoes/basic/{fit}/" + ANIMATION, "color": "black"},
        "glasses": {"template": "spritesheets/facial/glasses/round/{fit}/" + ANIMATION, "color": None},
    },
    "wealthy": {
        "shirt": {
            "template": {
                "male": "spritesheets/torso/clothes/longsleeve/formal/{fit}/" + ANIMATION,
                # formal shirt is male-only; female gets a white blouse
                "female": "spritesheets/torso/clothes/blouse_longsleeve/{fit}/" + ANIMATION,
            },
            "color": "white",
        },
        "tie": {"template": "spritesheets/neck/tie/necktie/{fit}/" + ANIMATION, "color": "maroon", "bodies": ["male"]},
        "jacket": {"template": "spritesheets/torso/jacket/collared/{fit}/" + ANIMATION, "color": "charcoal", "bodies": ["male"]},
        "necklace": {"template": "spritesheets/neck/necklace/chain/{fit}/" + ANIMATION, "color": None},
        "pants": {"template": "spritesheets/legs/formal/{fit}/" + ANIMATION, "color": "charcoal"},
        "shoes": {"template": "spritesheets/feet/shoes/basic/{fit}/" + ANIMATION, "color": "black"},
        "glasses": {"template": "spritesheets/facial/glasses/sunglasses/{fit}/" + ANIMATION, "color": None},
    },
}

FIT_FALLBACKS = ["male", "female", "thin", "adult", "universal"]


def fetch(path: str) -> bytes | None:
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / path.replace("/", "__")
    if cached.exists():
        return cached.read_bytes()
    try:
        with urllib.request.urlopen(f"{RAW}/{path}", timeout=30) as r:
            data = r.read()
    except Exception:
        return None
    cached.write_bytes(data)
    return data


def load_palettes(group: str) -> dict[str, list[str]]:
    data = fetch(f"palette_definitions/{group}/{group}_ulpc.json")
    if not data:
        sys.exit(f"FATAL: could not fetch {group} palettes")
    return json.loads(data)


def sheet_frame(path: str) -> Image.Image | None:
    data = fetch(path)
    if data is None:
        return None
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    if img.height != 256 or img.width % 64 != 0:
        print(f"  !! unexpected sheet size {img.size} for {path} — skipping")
        return None
    return img.crop(FRAME)


def find_source_ramp(
    img: Image.Image, palettes: dict[str, list[str]], min_coverage: float = 0.75
) -> str | None:
    """Best ramp by pixel coverage. Sheets often carry a stray outline color
    outside their ramp, so exact-subset matching is too strict; unmatched
    colors are simply left unrecolored by recolor()."""
    counts: dict[str, int] = {}
    for r, g, b, a in img.getdata():
        if a > 0:
            counts[f"#{r:02X}{g:02X}{b:02X}"] = counts.get(f"#{r:02X}{g:02X}{b:02X}", 0) + 1
    total = sum(counts.values())
    if total == 0:
        return None
    best, best_cov = None, 0.0
    for name, ramp in palettes.items():
        ramp_up = {c.upper() for c in ramp}
        cov = sum(n for c, n in counts.items() if c in ramp_up) / total
        if cov > best_cov:
            best, best_cov = name, cov
    return best if best_cov >= min_coverage else None


def recolor(img: Image.Image, source: list[str], target: list[str]) -> Image.Image:
    def hex2rgb(h):
        h = h.lstrip("#")
        return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))

    mapping = {hex2rgb(s): hex2rgb(t) for s, t in zip(source, target)}
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and (r, g, b) in mapping:
                nr, ng, nb = mapping[(r, g, b)]
                px[x, y] = (nr, ng, nb, a)
    return out


def frame_with_fit(
    template: str, preferred_fit: str, color: str | None
) -> tuple[Image.Image, str, bool] | None:
    """Try each fit in the palette layout ({fit}/walk.png), then the legacy
    pre-colored layout ({fit}/walk/{color}.png). Returns (frame, fit,
    needs_recolor) — legacy hits are already the target color."""
    fits = [preferred_fit] + [f for f in FIT_FALLBACKS if f != preferred_fit]
    for fit in fits:
        frame = sheet_frame(template.format(fit=fit))
        if frame is not None:
            return frame, fit, True
        if color:
            legacy = template.format(fit=fit).removesuffix(".png") + f"/{color}.png"
            frame = sheet_frame(legacy)
            if frame is not None:
                return frame, fit, False
    return None


used_sheets: set[str] = set()


def draw_cardboard_pants() -> Image.Image:
    """Hand-drawn pixel cardboard box worn as pants for the poor tier —
    no such garment exists in LPC. Coordinates target the LPC walk south
    frame: waist ~y41, feet visible below y55."""
    from PIL import ImageDraw

    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    outline = (94, 66, 34, 255)
    base = (192, 149, 94, 255)
    light = (217, 179, 128, 255)
    dark = (163, 120, 71, 255)

    x0, y0, x1, y1 = 22, 41, 41, 55
    d.rectangle([x0, y0, x1, y1], fill=base, outline=outline)
    d.rectangle([x0 + 1, y1 - 3, x1 - 1, y1 - 1], fill=dark)
    d.line([(x0 + 1, y0 + 1), (x1 - 1, y0 + 1)], fill=light)
    # open flaps sticking out at the waist
    d.polygon([(x0, y0), (x0 - 4, y0 - 4), (x0 - 2, y0 - 5), (x0 + 3, y0)], fill=light, outline=outline)
    d.polygon([(x1, y0), (x1 + 4, y0 - 4), (x1 + 2, y0 - 5), (x1 - 3, y0)], fill=light, outline=outline)
    # center seam
    d.line([(32, y0 + 2), (32, y1 - 2)], fill=dark)
    return img


def main() -> None:
    body_pal = load_palettes("body")
    hair_pal = load_palettes("hair")
    cloth_pal = load_palettes("cloth")
    print("hair palette colors available:", ", ".join(hair_pal))
    print("cloth palette colors available:", ", ".join(cloth_pal))

    failures: list[str] = []

    # --- identity bases: body + head + eyes composited, per body type + skin tone
    (OUT / "identity").mkdir(parents=True, exist_ok=True)
    eyes = sheet_frame(f"spritesheets/eyes/human/adult/{ANIMATION}")
    if eyes is not None:
        used_sheets.add("eyes/human/adult")
    for body_name in BODIES:
        body = sheet_frame(f"spritesheets/body/bodies/{body_name}/{ANIMATION}")
        head = sheet_frame(f"spritesheets/head/heads/human/{body_name}/{ANIMATION}")
        if body is None or head is None:
            failures.append(f"identity base {body_name} (body or head sheet missing)")
            continue
        used_sheets.add(f"body/bodies/{body_name}")
        used_sheets.add(f"head/heads/human/{body_name}")
        src_ramp_name = find_source_ramp(body, body_pal)
        if src_ramp_name is None:
            failures.append(f"identity base {body_name}: no matching body ramp")
            continue
        src_ramp = body_pal[src_ramp_name]
        for tone in SKIN_TONES:
            base = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            for layer in (body, head):
                base.alpha_composite(recolor(layer, src_ramp, body_pal[tone]))
            if eyes is not None:
                base.alpha_composite(eyes)
            base.save(OUT / "identity" / f"base_{body_name}_{tone}.png")
            print(f"identity base_{body_name}_{tone}.png")

    # --- hair: per style + color
    for style in HAIR_STYLES:
        frame = sheet_frame(f"spritesheets/hair/{style}/adult/{ANIMATION}")
        if frame is None:
            failures.append(f"hair {style}")
            continue
        used_sheets.add(f"hair/{style}/adult")
        src_name = find_source_ramp(frame, hair_pal)
        if src_name is None:
            failures.append(f"hair {style}: no matching hair ramp")
            continue
        for color in HAIR_COLORS:
            if color not in hair_pal:
                failures.append(f"hair color {color} not in palette")
                continue
            out = recolor(frame, hair_pal[src_name], hair_pal[color])
            out.save(OUT / "identity" / f"hair_{style}_{color}.png")
        print(f"hair {style} (base ramp {src_name}) x {len(HAIR_COLORS)} colors")

    # --- wealth garments: per tier + slot + body type
    for tier, slots in TIER_GARMENTS.items():
        tier_dir = OUT / "wealth" / tier
        tier_dir.mkdir(parents=True, exist_ok=True)
        for slot, spec in slots.items():
            cloth_color = spec.get("color")
            for body_name, fits in BODIES.items():
                if body_name not in spec.get("bodies", list(BODIES)):
                    continue
                template = spec["template"]
                if isinstance(template, dict):
                    template = template[body_name]
                preferred = fits["legs_fit"] if slot in ("pants", "shoes") else fits["clothes_fit"]
                result = frame_with_fit(template, preferred, cloth_color)
                if result is None:
                    failures.append(f"{tier}/{slot} for {body_name}")
                    continue
                frame, fit_used, needs_recolor = result
                used_sheets.add(
                    template.format(fit=fit_used)
                    .removeprefix("spritesheets/")
                    .removesuffix("/" + ANIMATION)
                )
                if cloth_color and needs_recolor:
                    src_name = find_source_ramp(frame, cloth_pal)
                    if src_name and cloth_color in cloth_pal:
                        frame = recolor(frame, cloth_pal[src_name], cloth_pal[cloth_color])
                    else:
                        print(f"  ~ {tier}/{slot}: no cloth ramp match (src={src_name}); left base colors")
                frame.save(tier_dir / f"{slot}_{body_name}.png")
                note = "" if fit_used == preferred else f" (fit fallback: {fit_used})"
                print(f"{tier}/{slot}_{body_name}.png{note}")

    # --- custom-drawn cardboard box pants for the poor tier
    cardboard = draw_cardboard_pants()
    for body_name in BODIES:
        cardboard.save(OUT / "wealth" / "poor" / f"pants_{body_name}.png")
        print(f"poor/pants_{body_name}.png (custom cardboard)")

    # --- attribution for exactly the sheets we used
    write_attribution()

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(" -", f)
        sys.exit(1)
    print("\nAll assets fetched OK.")


def write_attribution() -> None:
    data = fetch("CREDITS.csv")
    lines = [
        "# Sprite Attribution",
        "",
        "Pixel art from the [Universal LPC Spritesheet Character Generator]"
        f"(https://github.com/{REPO}), Liberated Pixel Cup assets,",
        "licensed CC-BY-SA 3.0 and/or GPL 3.0. Credits for the specific sheets used:",
        "",
    ]
    if data:
        reader = csv.reader(io.StringIO(data.decode("utf-8", errors="replace")))
        rows = list(reader)
        header, rows = rows[0], rows[1:]
        matched = [
            row for row in rows
            if any(row and row[0].lstrip("/").startswith(s) for s in used_sheets)
        ]
        lines.append("| " + " | ".join(header[:4]) + " |")
        lines.append("|" + "---|" * 4)
        for row in matched:
            lines.append("| " + " | ".join(c.replace("|", "/") for c in row[:4]) + " |")
    else:
        lines.append("(CREDITS.csv could not be fetched — see the repo's CREDITS.csv.)")
    (OUT / "ATTRIBUTION.md").write_text("\n".join(lines) + "\n")
    print(f"wrote ATTRIBUTION.md ({len(lines)} lines)")


if __name__ == "__main__":
    main()
