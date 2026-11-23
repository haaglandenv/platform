#!/usr/bin/env python3
"""Controleer het meegeleverde HV Control-pakket zonder externe dependencies."""

import argparse
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit


CHECKSUM = re.compile(r"([0-9a-fA-F]{64}) [ *](.+)")
CSS_URL = re.compile(r"url\(\s*(?:\"([^\"]*)\"|'([^']*)'|([^)]*?))\s*\)", re.IGNORECASE)
JS_ASSET = re.compile(r"\bassets/[\w./-]+\.(?:woff2?|png|webp|jpe?g|svg)\b")
EXPECTED_ROUTES = 53
GENERATED = (
    "dist/index.html",
    "dist/site.css",
    "dist/site.js",
    "dist/docs/HV-Control-Functioneel-Ontwerp.md",
    "dist/docs/HV-Control-Acceptatiechecklist.md",
)


class CheckError(Exception):
    """A missing, different or invalid part of the snapshot."""


class IndexParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = Counter()
        self.routes = []
        self.references = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.ids[element_id] += 1
        if "data-page" in attributes:
            self.routes.append(element_id)
        for name in ("href", "src", "poster", "data-src"):
            value = attributes.get(name)
            if value:
                self.references.add(value)
        for candidate in attributes.get("srcset", "").split(","):
            fields = candidate.split()
            if fields:
                self.references.add(fields[0])


def digest(path):
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def load_manifest(root):
    entries = {}
    names_seen = set()
    for number, line in enumerate((root / "SHA256SUMS").read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        match = CHECKSUM.fullmatch(line)
        if not match:
            raise CheckError(f"Onjuist formaat in SHA256SUMS op regel {number}.")
        checksum, name = match.groups()
        parts = name.split("/")
        if any(part in ("", ".", "..") for part in parts) or any(char in name for char in "\\:"):
            raise CheckError(f"Ongeldig bestandspad op regel {number} van SHA256SUMS.")
        folded = name.casefold()
        if folded in names_seen or folded == "sha256sums":
            raise CheckError(f"Dubbele of ongeldige vermelding in SHA256SUMS: {name}")
        names_seen.add(folded)
        entries[name] = checksum.lower()
    required = {"build.py", "dist/sw.js", "dist/manifest.webmanifest", "dist/assets/fonts.css", *GENERATED}
    if required - entries.keys():
        raise CheckError("Ontbrekend in SHA256SUMS: " + ", ".join(sorted(required - entries.keys())))
    return entries


def check_files(root, entries):
    problems = []
    for name, expected in entries.items():
        path = root.joinpath(*PurePosixPath(name).parts)
        if path.resolve() != path:
            problems.append(f"symbolische koppeling: {name}")
        elif not path.is_file():
            problems.append(f"ontbreekt: {name}")
        elif digest(path) != expected:
            problems.append(f"inhoud verschilt: {name}")
    if problems:
        raise CheckError("Bestandscontrole mislukt:\n  " + "\n  ".join(problems))
    print(f"Bestandscontrole geslaagd voor {len(entries)} bestanden.")


def local_reference(reference, base, root, entries, ids):
    url = urlsplit(reference)
    if url.scheme or url.netloc:
        return None
    path = unquote(url.path)
    if path:
        target = (base.parent / path).resolve()
        if target.is_dir() and target == root / "dist":
            target = target / "index.html"
        if not target.is_relative_to(root / "dist") or target.relative_to(root).as_posix() not in entries:
            raise CheckError(f"Lokale verwijzing ontbreekt of valt buiten dist: {reference} ({base.name})")
    else:
        target = base
    if url.fragment and target == root / "dist/index.html" and unquote(url.fragment) not in ids:
        raise CheckError(f"HTML-anker ontbreekt: #{url.fragment} ({base.name})")
    return target


def check_references(root, entries):
    dist = root / "dist"
    index = dist / "index.html"
    html = IndexParser()
    html.feed(index.read_text(encoding="utf-8"))
    html.close()
    duplicates = sorted(name for name, count in html.ids.items() if count > 1)
    if duplicates:
        raise CheckError("Dubbele HTML-ID's: " + ", ".join(duplicates))
    if len(html.routes) != EXPECTED_ROUTES or None in html.routes:
        raise CheckError(f"Verwacht {EXPECTED_ROUTES} schermen met een ID, vond {len(html.routes)}.")
    references = [(index, reference) for reference in sorted(html.references)]
    for name in ("site.css", "assets/fonts.css"):
        css = dist / name
        for match in CSS_URL.finditer(css.read_text(encoding="utf-8")):
            references.append((css, next(value for value in match.groups() if value is not None)))
    manifest = dist / "manifest.webmanifest"
    pwa = json.loads(manifest.read_text(encoding="utf-8"))
    references.append((manifest, pwa["start_url"]))
    references.extend((manifest, icon["src"]) for icon in pwa["icons"])
    script = dist / "site.js"
    references.extend((script, path) for path in sorted(set(JS_ASSET.findall(script.read_text(encoding="utf-8")))))
    checked = {local_reference(ref, base, root, entries, html.ids) for base, ref in references}
    checked.discard(None)
    print(f"{len(html.routes)} schermen, unieke HTML-ID’s en {len(checked)} lokale doelen gecontroleerd.")


def rebuild(root, entries):
    # The source build reads its original manifest, worker and assets from dist.
    # Recreate the generated files, while retaining those original build inputs.
    expected = {name: checksum for name, checksum in entries.items() if name.startswith("dist/")}
    with tempfile.TemporaryDirectory(prefix="hv-control-build-") as temp_dir:
        temp_root = Path(temp_dir)
        for name in entries:
            if name in GENERATED:
                continue
            target = temp_root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root / name, target)
        if sys.platform == "win32":
            # The original Linux snapshot uses LF. Apply this only in the isolated
            # rebuild, before the build computes the service-worker cache key.
            launch = """
from pathlib import Path
from runpy import run_path
original_open = Path.open

def open_lf(path, mode='r', buffering=-1, encoding=None, errors=None, newline=None):
    if mode == 'w' and newline is None:
        newline = '\\n'
    return original_open(path, mode, buffering, encoding, errors, newline)

Path.open = open_lf
run_path('build.py', run_name='__main__')
"""
            command = [sys.executable, "-X", "utf8", "-c", launch]
        else:
            command = [sys.executable, "-X", "utf8", "build.py"]
        result = subprocess.run(command, cwd=temp_root, check=False)
        if result.returncode:
            raise CheckError(f"build.py stopte met foutcode {result.returncode}.")
        found = {
            path.relative_to(temp_root).as_posix(): digest(path)
            for path in (temp_root / "dist").rglob("*") if path.is_file()
        }
        changes = sorted(name for name in expected.keys() | found.keys() if expected.get(name) != found.get(name))
        if changes:
            raise CheckError("Herbouw verschilt in:\n  " + "\n  ".join(changes))
    print(f"Herbouw geslaagd. Alle {len(expected)} bestanden in dist zijn byte voor byte identiek.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rebuild", action="store_true", help="herbouw in een tijdelijke map en vergelijk dist exact")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    try:
        entries = load_manifest(root)
        check_files(root, entries)
        check_references(root, entries)
        if args.rebuild:
            rebuild(root, entries)
    except (CheckError, OSError, RuntimeError, ValueError, KeyError) as error:
        print(f"Fout: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
