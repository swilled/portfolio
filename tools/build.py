"""Build the deployable copy of the site into dist/.

    python tools/build.py

Copies everything except the dev files, then minifies every CSS and JS file a page links to
(esbuild, through npx) and renames it after a hash of its contents: style.css -> style.3f2a91c0.css.
The pages are rewritten to match, and dist/_headers gets a rule per hashed file telling browsers
to keep it for a year. A changed file gets a new name, so nobody ever pairs new HTML with old CSS.

The source folder still runs as is with serve.py; dist/ is what gets uploaded to Cloudflare Pages.
Preview it with:  python serve.py 8766 dist
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
SKIP = {'dist', 'tools', '__pycache__', 'node_modules', 'README.md', 'serve.py', '.gitignore', '.claude', '.git'}
ESBUILD = 'esbuild@0.24.0'
REF = re.compile(r'''(<(?:link|script)\b[^>]*?\b(?:href|src)=")([^"#?]+\.(?:css|js))(")''')
# the source _headers revalidates these on every visit; hashed files don't need to
DEV_CACHE_RULES = {'/css/*', '/js/*', '/life/*'}


def rel(path):
    return os.path.relpath(path, DIST).replace(os.sep, '/')


def main():
    # empty dist/ rather than deleting it, so a preview server running inside it doesn't block the build
    if os.path.isdir(DIST):
        for name in os.listdir(DIST):
            p = os.path.join(DIST, name)
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    shutil.copytree(ROOT, DIST, ignore=lambda d, names: [n for n in names if d == ROOT and n in SKIP], dirs_exist_ok=True)

    pages = [os.path.join(d, f) for d, _, fs in os.walk(DIST) for f in fs if f.endswith('.html')]
    # every local stylesheet and script a page links to, as a path inside dist/
    assets = set()
    for page in pages:
        for m in REF.finditer(open(page, encoding='utf-8').read()):
            url = m.group(2)
            if url.startswith(('http:', 'https:', '//', 'data:')):
                continue
            base = DIST if url.startswith('/') else os.path.dirname(page)
            path = os.path.normpath(os.path.join(base, url.lstrip('/')))
            if os.path.isfile(path):
                assets.add(path)

    # minify them all in one esbuild run, then swap each for its hashed name
    out = tempfile.mkdtemp()
    npx = 'npx.cmd' if os.name == 'nt' else 'npx'
    subprocess.run([npx, '--yes', ESBUILD, *sorted(assets), '--minify', '--log-level=warning', '--legal-comments=none',
                    f'--outbase={DIST}', f'--outdir={out}'], check=True)
    renamed = {}
    before = after = 0
    for path in sorted(assets):
        data = open(os.path.join(out, os.path.relpath(path, DIST)), 'rb').read()
        before += os.path.getsize(path)
        after += len(data)
        stem, ext = os.path.splitext(path)
        hashed = f'{stem}.{hashlib.sha256(data).hexdigest()[:8]}{ext}'
        with open(hashed, 'wb') as f:
            f.write(data)
        os.remove(path)
        renamed[path] = hashed
    shutil.rmtree(out)

    for page in pages:
        html = open(page, encoding='utf-8').read()

        def swap(m):
            url = m.group(2)
            base = DIST if url.startswith('/') else os.path.dirname(page)
            path = os.path.normpath(os.path.join(base, url.lstrip('/')))
            if path not in renamed:
                return m.group(0)
            new = os.path.basename(renamed[path])
            return m.group(1) + url[: len(url) - len(os.path.basename(url))] + new + m.group(3)

        open(page, 'w', encoding='utf-8').write(REF.sub(swap, html))

    # _headers: drop the dev revalidate rules, add a year-long rule per hashed file
    blocks, cur = [], None
    for line in open(os.path.join(ROOT, '_headers'), encoding='utf-8').read().splitlines():
        if line and not line[0].isspace() and not line.startswith('#'):
            cur = [line]
            blocks.append(cur)
        elif cur is not None and line.strip() and not line.lstrip().startswith('#'):
            cur.append(line)
        elif line.startswith('#') and cur is None:
            blocks.append([line])
    lines = []
    for b in blocks:
        if b[0].strip() in DEV_CACHE_RULES:
            continue
        lines += b + ([''] if not b[0].startswith('#') else [])
    lines.append('# fingerprinted by tools/build.py: a new version gets a new name, so these never change')
    for hashed in sorted(renamed.values()):
        lines += ['/' + rel(hashed), '  Cache-Control: public, max-age=31536000, immutable']
    open(os.path.join(DIST, '_headers'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(DIST) for f in fs)
    biggest = max((os.path.getsize(os.path.join(d, f)), rel(os.path.join(d, f))) for d, _, fs in os.walk(DIST) for f in fs)
    print(f'{len(renamed)} css/js files: {before // 1024} KB -> {after // 1024} KB minified')
    print(f'dist/: {total / 1048576:.1f} MB, largest file {biggest[1]} ({biggest[0] / 1048576:.1f} MB, Pages allows 25)')
    if biggest[0] > 25 * 1048576:
        sys.exit('a file is over the 25 MB Pages limit')


if __name__ == '__main__':
    main()
