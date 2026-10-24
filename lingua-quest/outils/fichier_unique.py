"""Fabrique lingua-quest-complet.html : un seul fichier (code, styles, images, sons intégrés) qui s’ouvre sans serveur.
Lancer depuis lingua-quest/ : python3 outils/fichier_unique.py   (demande Node.js pour npx esbuild)."""
import base64, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'lingua-quest-complet.html')


def uri(path, mime):
    with open(os.path.join(ROOT, path), 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf8') as f:
        return f.read()


bundle = os.path.join(tempfile.mkdtemp(), 'app.js')
subprocess.run(['npx', '-y', 'esbuild@0.24.0', 'js/app.js', '--bundle', '--format=iife', '--minify', '--target=es2020', '--outfile=' + bundle], cwd=ROOT, check=True)
with open(bundle, encoding='utf8') as f:
    js = f.read()
css, html = read('style.css'), read('index.html')

assets = {'img/' + f: uri('img/' + f, 'image/webp') for f in sorted(os.listdir(os.path.join(ROOT, 'img')))}
sons = {f[:-4]: uri('sons/' + f, 'audio/mpeg') for f in sorted(os.listdir(os.path.join(ROOT, 'sons')))}
for k, v in assets.items():
    js, css = js.replace(k, v), css.replace(k, v)

html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '')
html = html.replace('href="icon-192.png"', 'href="%s"' % uri('icon-192.png', 'image/png'))
# préchargements de la version en ligne : inutiles ici, tout est déjà dans le fichier
html = re.sub(r'\s*<link rel="(modulepreload|preload)"[^>]*>', '', html)
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n%s\n</style>' % css)
html = html.replace('<script type="module" src="js/app.js"></script>', '<script>window.__LQ_SONS=%s;</script>\n<script>\n%s\n</script>' % (json.dumps(sons), js))

left = sorted(set(re.findall(r'img/[a-z0-9-]+\.webp', html)))
if left:
    sys.exit('Images non intégrées : ' + ', '.join(left))
with open(OUT, 'w', encoding='utf8') as f:
    f.write(html)
print('%s : %d Ko' % (os.path.basename(OUT), os.path.getsize(OUT) // 1024))
