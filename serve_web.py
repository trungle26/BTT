import argparse
import functools
import http.server
import mimetypes
import socketserver
from pathlib import Path


WEB_DIR = Path(__file__).resolve().parent / "web"


def build_handler():
    # Force module-friendly MIME types on Windows where .js can resolve to text/plain.
    mimetypes.add_type("text/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    return functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(WEB_DIR))


def main():
    parser = argparse.ArgumentParser(description="Serve the BTT web app with correct MIME types.")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on.")
    args = parser.parse_args()

    handler = build_handler()
    with socketserver.TCPServer(("", args.port), handler) as httpd:
        print(f"Serving {WEB_DIR} at http://localhost:{args.port}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server.")


if __name__ == "__main__":
    main()
