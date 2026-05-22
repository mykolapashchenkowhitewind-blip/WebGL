import http.server
import ssl


HOST = "0.0.0.0"
PORT = 8443


server = http.server.ThreadingHTTPServer((HOST, PORT), http.server.SimpleHTTPRequestHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile="localhost.pem", keyfile="localhost-key.pem")
server.socket = context.wrap_socket(server.socket, server_side=True)

print(f"Serving HTTPS on https://{HOST}:{PORT}")
server.serve_forever()
