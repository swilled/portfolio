"""Local preview server with HTTP range support, so video seeking works.

python serve.py            -> http://localhost:8765
python serve.py 9000       -> another port
python serve.py 8766 dist  -> preview the built copy (python tools/build.py first)
"""
import http.server
import os
import re
import sys


def load_headers(path='_headers'):
    """Parse a Cloudflare Pages _headers file into (regex, [(name, value)]) rules."""
    rules = []
    if not os.path.isfile(path):
        return rules
    for line in open(path, encoding='utf-8'):
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if not line[0].isspace():
            rules.append((re.compile('^' + re.escape(line.strip()).replace(r'\*', '.*') + '$'), []))
        elif rules and ':' in line:
            name, value = line.strip().split(':', 1)
            rules[-1][1].append((name.strip(), value.strip()))
    return rules


HEADERS = []


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)', rng)
        size = os.path.getsize(path)
        start = int(m.group(1)) if m and m.group(1) else 0
        end = int(m.group(2)) if m and m.group(2) else size - 1
        if start >= size:
            self.send_error(416)
            return None
        end = min(end, size - 1)
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        self.range_left = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, 'range_left', None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            chunk = source.read(min(64 * 1024, left))
            if not chunk:
                break
            try:
                outputfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
            left -= len(chunk)

    def end_headers(self):
        # same headers Cloudflare will send, matching values joined like Pages does
        url = self.path.split('?', 1)[0]
        merged = {}
        for rx, hdrs in HEADERS:
            if rx.match(url):
                for name, value in hdrs:
                    merged[name] = f'{merged[name]}, {value}' if name in merged else value
        for name, value in merged.items():
            self.send_header(name, value)
        if not self.headers.get('Range'):
            self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), *sys.argv[2:3]))
    HEADERS = load_headers()
    print(f'serving on http://localhost:{port}')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), RangeHandler).serve_forever()
