import http.server as h,os
os.chdir(os.path.dirname(__file__))
class C(h.SimpleHTTPRequestHandler):
 def end_headers(self):
  self.send_header('Access-Control-Allow-Origin','*');self.send_header('Cache-Control','no-store');super().end_headers()
h.ThreadingHTTPServer(('0.0.0.0',5500),C).serve_forever()
