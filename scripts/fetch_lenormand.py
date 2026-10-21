"""Fetch the Dondorf Wahrsage-Karten (1910) Lenormand scans from the Etteilla Foundation (CC BY-NC 4.0) into deck/l01.jpg … l36.jpg."""
import os
import re
import urllib.parse
import urllib.request
from io import BytesIO

from PIL import Image

PAGE = 'https://new.etteilla.org/en/decks/wahrsage-karten/'
BLOB = 'https://jywqgsebj0csywh1.public.blob.vercel-storage.com/'
UA = {'User-Agent': 'Mozilla/5.0 (Familiar deck fetch)'}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()


html = get(PAGE).decode()
cards = {}
for tag in re.findall(r'<img[^>]*>', html):
    n = re.search(r'alt="card image (\d+)"', tag)
    src = re.search(r'(?:src|srcset)="([^"]*)"', tag)
    if not (n and src):
        continue
    blob = re.search(r'blob\.vercel-storage\.com/(c/\d+/[0-9a-f]+\.avif)', urllib.parse.unquote(src.group(1)))
    if blob and blob.group(1) not in cards.values():
        cards.setdefault(int(n.group(1)), blob.group(1))

urls = [cards[i] for i in sorted(cards)][:36]
if len(urls) != 36:
    raise SystemExit(f'expected 36 cards, found {len(urls)}')

os.makedirs('deck', exist_ok=True)
for i, path in enumerate(urls, 1):
    im = Image.open(BytesIO(get(BLOB + path))).convert('RGB')
    im = im.resize((600, round(im.height * 600 / im.width)), Image.LANCZOS)
    im.save(f'deck/l{i:02d}.jpg', quality=85)
    print(f'l{i:02d}', path)
