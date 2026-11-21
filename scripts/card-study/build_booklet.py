"""Build the card-study booklet: A5 pages (card-study-<lang>.pdf) and an A4 2-up
saddle-stitch imposition for duplex printing (card-study-<lang>-print.pdf).

Usage: python3 scripts/card-study/build_booklet.py [--cards m00,m01] [--out DIR]
Card studies are read from src/card-study/ (the app's own copy); art and fonts sit next to this script.
Needs pypdf and google-chrome.
"""
import argparse, base64, html, io, json, subprocess, tempfile, urllib.request
from pathlib import Path
from pypdf import PdfReader, PdfWriter, Transformation, PageObject

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / 'src' / 'card-study'
RWS_URL = 'https://github.com/giovlnv/ios_202610.familiar/releases/download/deck-rws'
ORDER = [f'm{i:02d}' for i in range(22)] + [f'{s}{n:02d}' for s in ('wands', 'cups', 'swords', 'pents') for n in range(1, 15)]
TINTS = {'spiritual': '#e4ecf6', 'material': '#f4ecd6', 'mental': '#ece5f2', 'physical': '#e3f1f2',
         'emotional': '#f5e4e5', 'timing': '#ebeaee', 'relational': '#f3e7dc', 'advice': '#f6efd9'}
A5 = (419.53, 595.28)
e = html.escape


def card_image(cid, cache):
    f = cache / f'{cid}.jpg'
    if not f.exists():
        f.write_bytes(urllib.request.urlopen(f'{RWS_URL}/{cid}.jpg').read())
    return 'data:image/jpeg;base64,' + base64.b64encode(f.read_bytes()).decode()


def crop(img, c, size):
    bg = f'{100 / (2 * c["r"]):.1f}%'
    pos_x = (c['x'] - c['r']) / (1 - 2 * c['r']) * 100 if c['r'] < .5 else 50
    ratio = 839 / 500
    ry = c['r'] / ratio
    pos_y = (c['y'] - ry) / (1 - 2 * ry) * 100
    return (f'<div class="dot" style="width:{size}mm;height:{size}mm;background-image:url({img});'
            f'background-size:{bg} auto;background-position:{pos_x:.1f}% {pos_y:.1f}%"></div>')


def bullets(items):
    return '<ul>' + ''.join(f'<li>{e(i)}</li>' for i in items) + '</ul>' if items else '<p class="none">–</p>'


def pages(d, lang, img, first):
    t = lambda o: o[lang]
    syms = ''.join(f'<div class="sym">{crop(img, s["crop"], 13)}<div><h4>{e(t(s["title"]))}</h4>{bullets(t(s["keywords"]))}</div></div>' for s in d['symbols'])
    cols = ''.join(f'<div class="col"><span class="sw" style="background:{c["hex"]}"></span><div><h4>{e(t(c["name"]))}</h4>{bullets(t(c["keywords"]))}</div></div>' for c in d['colours'])
    planes = ''.join(
        f'<div class="pl {p["id"]}" style="background:{TINTS.get(p["id"], "")}"><h4>{e(t(p["title"]))}</h4>{bullets(t(p["bullets"]))}'
        f'<p class="q">{e(t(p["line"])) if t(p["bullets"]) else ""}</p></div>' for p in d['planes'])
    return f'''
<section class="page">
  <span class="no">{first}</span>
  <header><img src="{img}"><div><h1>{e(t(d["name"]).upper())}</h1><p class="sub">{e(t(d["subtitle"]))}</p><p>{e(t(d["intro"]))}</p></div></header>
  <div class="syms">{syms}</div>
  <h3>{"Cores" if lang == "pt" else "Colours"}</h3>
  <div class="cols">{cols}</div>
</section>
<section class="page">
  <span class="no">{first + 1}</span>
  <h2>{e(t(d["name"]))}</h2>
  <div class="sum">{"".join(f"<p>{e(l)}</p>" for l in t(d["summary"]))}</div>
  <div class="planes">{planes}</div>
</section>'''


def front(lang):
    t = lambda o: o[lang]
    i = json.loads((DATA / 'intro.json').read_text())
    shadow = (HERE / 'art' / 'shadow-reading.svg').read_text()
    h, c, p = i['howTo'], i['colours'], i['planes']
    parts = ''.join(f'<div class="part"><h4>{e(t(x["title"]))}</h4><p>{e(t(x["text"]))}</p></div>' for x in h['parts'])
    cl = ''.join(f'<div class="col"><span class="sw" style="background:{x["hex"]}"></span><div><h4>{e(t(x["name"]))}</h4><p>{e(t(x["keywords"]))}</p></div></div>' for x in c['list'])
    pl = ''.join(f'<div class="pl {x["id"]}" style="background:{TINTS.get(x["id"], "")}"><h4>{e(t(x["name"]))}</h4><p>{e(t(x["text"]))}</p></div>' for x in p['list'])
    return f'''
<section class="page cover">
  <div class="frame"></div><div class="frame2"></div>
  <div class="word">FAMILIAR</div>
  <div class="art">{shadow}</div>
  <div class="ttl"><h1>{e(t(i["title"]))}</h1><p>{e(t(i["tagline"]))}</p></div>
</section>
<section class="page intro"><span class="no">2</span><h2>{e(t(h["title"]))}</h2><p class="lead">{e(t(h["lead"]))}</p>
  <div class="parts">{parts}</div><p class="dash"><b>–</b> {e(t(h["dash"]))}</p></section>
<section class="page intro"><span class="no">3</span><h2>{e(t(c["title"]))}</h2><p class="lead">{e(t(c["lead"]))}</p>
  <div class="cl">{cl}</div><p class="dash">{e(t(c["sky"]))}</p></section>
<section class="page intro"><span class="no">4</span><h2>{e(t(p["title"]))}</h2><p class="lead">{e(t(p["lead"]))}</p>
  <div class="planes ip">{pl}</div></section>'''


CSS = '''
@font-face{font-family:Playfair;src:url(FONTS/PlayfairDisplay_500Medium.ttf)}
@font-face{font-family:Playfair;font-style:italic;src:url(FONTS/PlayfairDisplay_500Medium_Italic.ttf)}
@page{size:148mm 210mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,sans-serif;color:#221a2e;font-size:7pt;line-height:1.3}
.page{width:148mm;height:210mm;padding:11mm 11mm 9mm;position:relative;overflow:hidden;page-break-after:always;background:#fbf9fc;
  background-image:url("data:image/svg+xml;utf8,STARS");background-size:148mm 210mm}
.no{position:absolute;top:6mm;right:9mm;font-family:Playfair;color:#9a7420;font-size:8pt}
h1,h2,h3,h4,.sub,.no{font-family:Playfair;font-weight:500;font-variant-numeric:lining-nums}
h1{font-size:19pt;letter-spacing:.08em;color:#3a2350}
h2{font-size:20pt;text-align:center;color:#3a2350;margin-bottom:2mm}
h3{font-size:9pt;color:#9a7420;letter-spacing:.12em;text-transform:uppercase;margin:3mm 0 2mm;border-top:.3mm solid #d9b45b;padding-top:2mm}
h4{font-size:7.6pt;color:#3a2350;margin-bottom:.6mm}
.sub{font-family:Playfair;font-style:italic;color:#9a7420;font-size:9pt;margin:.5mm 0 2mm}
header{display:flex;gap:4mm;align-items:flex-start;margin-bottom:3.5mm}
header img{width:30mm;border-radius:1.2mm;border:.4mm solid #d9b45b}
header p{font-size:7.6pt}
ul{list-style:none}
li{padding-left:2.4mm;position:relative}
li:before{content:"✦";position:absolute;left:0;color:#c9a14a;font-size:4.5pt;top:.5mm}
.syms{display:grid;grid-template-columns:1fr 1fr;gap:2.6mm 4mm}
.sym,.col{display:flex;gap:2.4mm;align-items:flex-start}
.dot{flex:none;border-radius:50%;border:.4mm solid #d9b45b;background-repeat:no-repeat}
.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2.4mm 3mm}
.sw{flex:none;width:8mm;height:8mm;border-radius:50%;border:.3mm solid #b8a9c6}
.sum{text-align:center;font-size:7.8pt;margin-bottom:4mm}
.sum p+p{margin-top:.4mm}
.planes{display:grid;grid-template-columns:1fr 1fr;gap:2.4mm}
.pl{border-radius:2mm;padding:2.4mm 3mm;min-height:31mm}
.pl .q{font-family:Playfair;font-style:italic;margin-top:1.2mm;color:#4a3560}
.pl.challenge{grid-column:1/3;min-height:0;background:#3a2350;color:#ece6f5}
.pl.challenge h4,.pl.challenge .q{color:#e8c767}
.none{color:#9a90ad;font-size:10pt}
.cover{padding:0}
.frame,.frame2{position:absolute;inset:7mm;border:.5mm solid #d9b45b;border-radius:3mm}
.frame2{inset:9mm;border-width:.25mm;border-color:#d9b45b88;border-radius:2mm}
.word{position:absolute;top:22mm;left:0;right:0;text-align:center;font-family:Playfair;color:#9a7420;font-size:11pt;letter-spacing:.42em;padding-left:.42em}
.art{position:absolute;left:26mm;top:44mm;width:96mm}
.ttl{position:absolute;bottom:32mm;left:0;right:0;text-align:center;font-family:Playfair;font-variant-numeric:lining-nums}
.ttl h1{font-size:27pt;letter-spacing:0}
.ttl p{font-style:italic;color:#9a7420;font-size:10.5pt;margin-top:1.5mm}
.intro{padding-top:16mm}
.intro h2{font-size:22pt}
.lead{text-align:center;font-size:8.6pt;margin:0 9mm 7mm}
.parts{display:grid;grid-template-columns:1fr 1fr;gap:7mm 6mm}
.part{border-top:.3mm solid #d9b45b;padding-top:2mm}
.intro h4{font-size:9pt;margin-bottom:1mm}
.part p,.intro .col p,.ip p{font-size:8.4pt}
.intro .sw{width:10mm;height:10mm}
.dash{margin:9mm 6mm 0;text-align:center;font-size:8.6pt;color:#4a3560;font-family:Playfair;font-style:italic}
.dash b{font-style:normal;font-size:11pt;color:#9a7420}
.cl{display:grid;grid-template-columns:1fr 1fr;gap:4.2mm 5mm}
.ip .pl{min-height:25mm;padding:3.5mm}
.ip .pl.challenge{grid-column:1/3}
'''

STARS = ''.join(
    f'<path transform="translate({x} {y}) scale({s})" d="M0-10C1-2 2-1 10 0C2 1 1 2 0 10C-1 2-2 1-10 0C-2-1-1-2 0-10Z" fill="%23d9b45b" opacity="{o}"/>'
    for x, y, s, o in [(14, 16, .9, .7), (8, 44, .35, .5), (136, 22, .45, .5), (141, 70, .3, .45), (8, 95, .3, .45),
                       (140, 130, .5, .5), (9, 160, .4, .5), (139, 192, .35, .45), (20, 202, .3, .4)])
STARS_SVG = f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 148 210'>{STARS}</svg>".replace('"', "'")


def impose(src, dst):
    r = PdfReader(src)
    pg = list(r.pages)
    while len(pg) % 4:
        pg.append(None)
    n, w = len(pg), PdfWriter()
    for i in range(n // 2):
        left, right = (pg[n - 1 - i], pg[i]) if i % 2 == 0 else (pg[i], pg[n - 1 - i])
        sheet = PageObject.create_blank_page(width=A5[0] * 2, height=A5[1])
        for j, p in enumerate((left, right)):
            if p is not None:
                sheet.merge_transformed_page(p, Transformation().translate(tx=A5[0] * j))
        w.add_page(sheet)
    w.write(dst)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cards')
    ap.add_argument('--out', default=str(HERE / 'out'))
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    cache = out / 'images'; cache.mkdir(exist_ok=True)
    ids = a.cards.split(',') if a.cards else [c for c in ORDER if (DATA / f'{c}.json').exists()]
    for lang in ('pt', 'en'):
        body = front(lang) + ''.join(pages(json.loads((DATA / f'{c}.json').read_text()), lang, card_image(c, cache), 5 + 2 * i) for i, c in enumerate(ids))
        css = CSS.replace('FONTS', (HERE / 'fonts').resolve().as_uri()).replace('STARS', STARS_SVG.replace('#', '%23'))
        doc = f'<!doctype html><html lang="{lang}"><meta charset="utf-8"><style>{css}</style><body>{body}</body></html>'
        with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as f:
            f.write(doc)
        pdf = out / f'card-study-{lang}.pdf'
        subprocess.run(['google-chrome', '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
                        f'--print-to-pdf={pdf}', f'file://{f.name}'], check=True, capture_output=True)
        impose(pdf, out / f'card-study-{lang}-print.pdf')
        print(pdf)


if __name__ == '__main__':
    main()
