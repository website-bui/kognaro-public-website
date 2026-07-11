# Measures which PDF page each H1/H2 heading lands on and writes
# whitepaper/toc-pages.json — consumed by build-print.mjs to put page numbers
# in the printed TOC (Chromium cannot generate them in CSS). Run against a
# FIRST-pass PDF (built without numbers); the TOC stays one page either way,
# so the numbers hold for the second pass.
#
# Usage: python scripts/extract-toc-pages.py   (requires: pip install pypdf)
import json
import re
from pathlib import Path

from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent

# INTENT: same heading extraction as build-print.mjs.
lines = (root / "v5-normalized.md").read_text(encoding="utf8").split("\n")
start = next(i for i, l in enumerate(lines) if l.startswith("# 1."))
heads = []
for l in lines[start:]:
    m = re.match(r"^(#{1,2})\s+(.*)$", l)
    if m:
        heads.append(re.sub(r"[*_]", "", m.group(2)).strip())

norm = lambda s: re.sub(r"\s+", " ", s)
reader = PdfReader(str(root / "whitepaper" / "kognaro-trust-is-structural.pdf"))
texts = [norm(p.extract_text() or "") for p in reader.pages]

# INTENT: sequential scan starting AFTER the cover (p1) and TOC (p2) — the
# TOC page contains every heading string and would swallow every match.
pages, ptr, missing = [], 2, []
for h in heads:
    found = None
    for i in range(ptr, len(texts)):
        if norm(h) in texts[i]:
            found = i + 1
            ptr = i  # headings are ordered; never scan backwards
            break
    pages.append(found)
    if found is None:
        missing.append(h)

if missing:
    raise SystemExit(f"FAILED to locate {len(missing)} headings: {missing}")

(root / "whitepaper" / "toc-pages.json").write_text(json.dumps(pages))
print(f"mapped {len(pages)} headings: pages {pages[0]}..{pages[-1]}")
