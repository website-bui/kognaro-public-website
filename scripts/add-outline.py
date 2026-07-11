# Post-processes whitepaper/kognaro-trust-is-structural.pdf to add the PDF
# outline (bookmarks sidebar): Cover, Contents, then every H1 with its H2
# children, targeted at the pages measured in whitepaper/toc-pages.json.
# Chromium cannot emit outlines itself; TOC hyperlinks are already in the PDF
# (carried over from the print.html anchors) — this adds the viewer sidebar.
#
# Usage: python scripts/add-outline.py   (requires: pip install pypdf)
import json
import re
from pathlib import Path

from pypdf import PdfReader, PdfWriter

root = Path(__file__).resolve().parent.parent
pdf_path = root / "whitepaper" / "kognaro-trust-is-structural.pdf"

# INTENT: same heading extraction as build-print.mjs so the outline always
# matches the TOC (body starts at '# 1.', H1/H2 only, emphasis stripped).
lines = (root / "v5-normalized.md").read_text(encoding="utf8").split("\n")
start = next(i for i, l in enumerate(lines) if l.startswith("# 1."))
heads = []
for l in lines[start:]:
    m = re.match(r"^(#{1,2})\s+(.*)$", l)
    if m:
        heads.append((len(m.group(1)), re.sub(r"[*_]", "", m.group(2)).strip()))

pages = json.loads((root / "whitepaper" / "toc-pages.json").read_text())
assert len(pages) == len(heads), "toc-pages.json out of sync with headings"

writer = PdfWriter(clone_from=str(pdf_path))
writer.add_outline_item("Cover", 0)
writer.add_outline_item("Contents", 1)
parent = None
for (lvl, title), pg in zip(heads, pages):
    if lvl == 1:
        parent = writer.add_outline_item(title, pg - 1)
    else:
        writer.add_outline_item(title, pg - 1, parent=parent)

with open(pdf_path, "wb") as f:
    writer.write(f)
print(f"outline added: {len(heads) + 2} entries -> {pdf_path.name}")
