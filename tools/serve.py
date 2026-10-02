"""Local preview with the same routing as Vercel: /haldi, /mehndi, /guests -> their pages.
Binds 0.0.0.0 so a phone on the same Wi-Fi can open it. Usage: python tools/serve.py [port]"""
import http.server, os, re, socket, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_GET(self):
        path = self.path.split("?")[0]
        if re.fullmatch(r"/i/[a-z0-9]+/?", path):
            self.path = "/index.html"
        elif re.fullmatch(r"/[a-z-]+/?", path):
            name = path.strip("/")
            html = os.path.join(ROOT, f"{name}.html")
            self.path = f"/{name}.html" if os.path.exists(html) else "/index.html"
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    s.connect(("8.8.8.8", 80)); lan = s.getsockname()[0]
finally:
    s.close()
print(f"Local:  http://127.0.0.1:{PORT}\nPhone:  http://{lan}:{PORT}  (same Wi-Fi)", flush=True)
http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
