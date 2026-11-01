"""Convert a Claude Docs read (saved JSON) to readable Markdown.

usage: python book2md.py <saved-read.txt> <out.md> [--ids]
--ids prefixes each top-level block with its block id, for targeted edits.
"""
import html
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
with_ids = "--ids" in sys.argv
d = json.loads(open(src, encoding="utf-8").read())["data"]
x = d["xml"]
print("rev", d.get("rev"))
# Top-level block ids (paragraph/table directly under <doc>) — mark them.
if with_ids:
    x = re.sub(r"<(paragraph|table|list)\s+id='([^']+)'", lambda m: f"\u0001{m.group(2)}\u0002<{m.group(1)} id='{m.group(2)}'", x)
x = re.sub(r"<(paragraph|listItem|tableRow|row)[^>]*heading=.(\d).[^>]*>", lambda m: "\n" + "#" * int(m.group(2)) + " ", x)
x = re.sub(r"<listItem[^>]*>", "\n- ", x)
x = re.sub(r"<paragraph[^>]*>", "\n", x)
x = re.sub(r"<(tableRow|row)[^>]*>", "\n|", x)
x = re.sub(r"<(tableCell|cell)[^>]*>", " ", x)
x = re.sub(r"</(tableCell|cell)>", " |", x)
x = re.sub(r"<date[^>]*value=.([^']*).[^>]*/>", r"\1", x)
x = re.sub(r"<mention[^>]*name=.([^']*).[^>]*/>", r"@\1", x)
x = re.sub(r"<bold>", "**", x)
x = re.sub(r"</bold>", "**", x)
x = re.sub(r"<[^>]+>", "", x)
x = html.unescape(x)
if with_ids:
    x = re.sub("\u0001([^\u0002]+)\u0002", lambda m: f"\n[{m.group(1)}]", x)
x = re.sub(r"\n\s*\n+", "\n", x)
open(out, "w", encoding="utf-8").write(x)
print(len(x), "chars")
