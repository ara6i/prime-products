#!/usr/bin/env python3
"""Direct-PDP size-chart extractor with incremental CSV and JSONL monitoring.

Only `pdp_url` values are requested. Affiliate/redirect domains and URLs with
an embedded `murl` are rejected before any request is made.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


OUTPUT_FIELDS = [
    "product_id", "merchant", "input_url", "canonical_url", "category",
    "status", "source_type", "table_index", "size_value",
    "measurements_json", "chart_headers_json", "evidence_path", "confidence", "message",
]
SIZE_HEADER = re.compile(r"^(size|sizes|us\s*size|uk\s*size|eu\s*size|international\s*size)$", re.I)
MEASUREMENT_HEADER = re.compile(r"bust|chest|waist|hip|hips|inseam|length|sleeve|shoulder|thigh|rise|foot\s*length", re.I)
SIZE_TOKEN = re.compile(r"^(?:XXS|XS|S|M|L|XL|XXL|XXXL|0{1,2}|[2-9]|1[0-9]|2[0-9])$", re.I)
BLOCKED_TEXT = re.compile(r"captcha|access denied|unusual traffic|verify you are human|robot check", re.I)


class TableCollector(HTMLParser):
    """Small dependency-free HTML table collector that preserves blank cells."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: List[List[List[str]]] = []
        self._table_depth = 0
        self._table: Optional[List[List[str]]] = None
        self._row: Optional[List[str]] = None
        self._cell: Optional[List[str]] = None

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag == "table":
            self._table_depth += 1
            if self._table_depth == 1:
                self._table = []
        elif self._table_depth and tag == "tr":
            self._row = []
        elif self._table_depth and tag in {"td", "th"}:
            self._cell = []
        elif self._cell is not None and tag == "br":
            self._cell.append(" ")

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._cell is not None and self._row is not None:
            self._row.append(clean_text("".join(self._cell)))
            self._cell = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            if self._row:
                self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table_depth:
            self._table_depth -= 1
            if self._table_depth == 0 and self._table is not None:
                self.tables.append(self._table)
                self._table = None


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def is_size_token(value: str) -> bool:
    return bool(SIZE_TOKEN.fullmatch(clean_text(value)))


def normalise_table(raw_rows: List[List[str]]) -> Optional[Tuple[List[str], List[List[str]]]]:
    if len(raw_rows) < 2:
        return None
    width = max(len(row) for row in raw_rows)
    rows = [row + [""] * (width - len(row)) for row in raw_rows]
    first_row = rows[0]

    # Vertical retail chart: columns are sizes, first cell of following rows is
    # a measurement name. Transpose into ordinary Size / measurement rows.
    size_columns = [(index, value) for index, value in enumerate(first_row) if is_size_token(value)]
    vertical_measurements = []
    for row in rows[1:]:
        # Retailers can put a second, separate numeric-size chart directly
        # below an alpha-size chart. Do not merge both systems into one guide.
        if sum(1 for cell in row if is_size_token(cell)) >= 3:
            break
        if MEASUREMENT_HEADER.search(row[0]) and any(row[index] for index, _ in size_columns):
            vertical_measurements.append((row[0], [row[index] for index, _ in size_columns]))
    if len(size_columns) >= 3 and vertical_measurements:
        headers = ["Size"] + [name for name, _ in vertical_measurements]
        data = [[size] + [values[position] for _, values in vertical_measurements]
                for position, (_, size) in enumerate(size_columns)]
        return headers, data

    # Conventional chart: first row contains the header cells.
    headers = [clean_text(value) for value in first_row]
    if not any(SIZE_HEADER.fullmatch(header) or MEASUREMENT_HEADER.search(header) for header in headers):
        return None
    data = [row for row in rows[1:] if any(row)]
    if not data:
        return None
    return headers, data


def parse_tables(html: str) -> List[Tuple[int, List[str], List[List[str]]]]:
    parser = TableCollector()
    parser.feed(html)
    parsed = []
    for index, raw_table in enumerate(parser.tables):
        normalised = normalise_table(raw_table)
        if normalised:
            headers, rows = normalised
            parsed.append((index, headers, rows))
    return parsed


def direct_url(value: str) -> bool:
    try:
        url = urlparse(value)
    except ValueError:
        return False
    return (
        url.scheme in {"http", "https"}
        and bool(url.netloc)
        and not url.netloc.lower().endswith("linksynergy.com")
        and "murl=" not in url.query.lower()
    )


def event(monitor, payload: Dict[str, object]) -> None:
    payload = {"at": datetime.now(timezone.utc).isoformat(), **payload}
    line = json.dumps(payload, ensure_ascii=False)
    print(line, file=sys.stderr, flush=True)
    monitor.write(line + "\n")
    monitor.flush()


def evidence_dir(base: Path, product_id: str, pdp_url: str) -> Path:
    safe_id = re.sub(r"[^a-zA-Z0-9._-]+", "_", product_id)[:80] or "unknown-product"
    suffix = hashlib.sha256(pdp_url.encode()).hexdigest()[:10]
    result = base / f"{safe_id}-{suffix}"
    result.mkdir(parents=True, exist_ok=True)
    return result


def output_rows(product: Dict[str, str], canonical_url: str, status: str, tables, evidence: Path, message: str) -> List[Dict[str, str]]:
    shared = {
        "product_id": product["product_id"], "merchant": product.get("merchant", ""),
        "input_url": product["pdp_url"], "canonical_url": canonical_url,
        "category": product.get("category", ""), "status": status,
        "source_type": "direct_pdp_html" if status == "extracted" else "unknown_scope",
        "evidence_path": str(evidence), "message": message,
    }
    records = []
    for table_index, headers, data_rows in tables:
        size_index = next((index for index, header in enumerate(headers) if SIZE_HEADER.fullmatch(header)), 0)
        for row in data_rows:
            measurements = {header: row[index] if index < len(row) else "" for index, header in enumerate(headers)}
            records.append({
                **shared, "table_index": str(table_index),
                "size_value": row[size_index] if size_index < len(row) else "",
                "measurements_json": json.dumps(measurements, ensure_ascii=False),
                "chart_headers_json": json.dumps(headers, ensure_ascii=False),
                "confidence": "0.95",
            })
    return records or [{
        **shared, "table_index": "", "size_value": "", "measurements_json": "",
        "chart_headers_json": "", "confidence": "",
    }]


def run(args: argparse.Namespace) -> None:
    load_local_proxy_environment()
    with Path(args.input).open(newline="", encoding="utf-8") as source:
        products = list(csv.DictReader(source))
    if not products or not {"product_id", "pdp_url"}.issubset(products[0]):
        raise ValueError("Input CSV must include product_id and pdp_url columns.")
    products = products[:args.limit] if args.limit else products

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_base = Path(args.evidence_dir)
    evidence_base.mkdir(parents=True, exist_ok=True)
    monitor_path = Path(args.monitor_path)
    monitor_path.parent.mkdir(parents=True, exist_ok=True)
    proxy = proxy_configuration(args)
    with output_path.open("w", newline="", encoding="utf-8") as output, monitor_path.open("w", encoding="utf-8") as monitor, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=args.browser, proxy=proxy)
        context = browser.new_context(user_agent="PrimeStyleAI-SizeChartResearch/0.2 (+contact: data@primestyle.ai)")
        page = context.new_page()
        try:
            writer = csv.DictWriter(output, fieldnames=OUTPUT_FIELDS)
            writer.writeheader()
            output.flush()
            for index, product in enumerate(products, start=1):
                product_id = product.get("product_id", "")
                url = product.get("pdp_url", "")
                event(monitor, {"event": "started", "index": index, "total": len(products), "product_id": product_id, "url": url})
                evidence = evidence_dir(evidence_base, product_id, url)
                if not direct_url(url):
                    records = output_rows(product, "", "rejected_non_direct_url", [], evidence, "Affiliate, redirect, or invalid URL rejected before request.")
                else:
                    try:
                        response = page.goto(url, wait_until="domcontentloaded", timeout=args.timeout * 1000)
                        page.wait_for_timeout(700)
                        click_size_chart(page)
                        page.wait_for_timeout(700)
                        canonical = page.url
                        html = page.content()
                        (evidence / "source.html").write_text(html, encoding="utf-8")
                        response_status = response.status if response else 0
                        if response_status in {401, 403} or BLOCKED_TEXT.search(html[:20000]):
                            records = output_rows(product, canonical, "blocked_or_captcha", [], evidence, f"Retailer response {response_status or 'blocked page'}.")
                        elif response_status >= 400:
                            records = output_rows(product, canonical, "failed", [], evidence, f"Retailer response {response_status}.")
                        else:
                            tables = parse_tables(html)
                            status = "extracted" if tables else "not_found"
                            message = "Structured rendered-PDP chart extracted." if tables else "No parseable rendered HTML size chart found."
                            records = output_rows(product, canonical, status, tables, evidence, message)
                    except Exception as error:  # Browser/network error is recorded per product, not hidden.
                        records = output_rows(product, page.url, "failed", [], evidence, f"Browser error: {error}")
                writer.writerows(records)
                output.flush()
                event(monitor, {"event": records[0]["status"], "index": index, "total": len(products), "product_id": product_id, "rows_written": len(records), "message": records[0]["message"]})
                if index < len(products) and args.delay_ms:
                    time.sleep(args.delay_ms / 1000)
        finally:
            context.close()
            browser.close()


def click_size_chart(page) -> bool:
    return bool(page.evaluate("""() => {
        const matcher = /\\b(size\\s*(guide|chart)|fit\\s*guide|sizing)\\b/i;
        const candidate = [...document.querySelectorAll('a, button, [role=button], summary')].find((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 2 && rect.height > 2
                && (matcher.test(element.textContent || '') || matcher.test(element.getAttribute('aria-label') || ''));
        });
        if (!(candidate instanceof HTMLElement)) return false;
        candidate.scrollIntoView({ block: 'center' });
        candidate.click();
        return true;
    }"""))


def proxy_configuration(args: argparse.Namespace) -> Optional[Dict[str, str]]:
    """Return an optional Playwright proxy configuration without exposing secrets."""
    server = args.proxy_server or os.getenv("PROXY_SELLER_PROXY_SERVER")
    username = args.proxy_username or os.getenv("PROXY_SELLER_PROXY_USERNAME")
    password = args.proxy_password or os.getenv("PROXY_SELLER_PROXY_PASSWORD")
    if not server:
        return None
    if bool(username) != bool(password):
        raise ValueError("Proxy username and password must be supplied together.")
    config = {"server": server}
    if username:
        config["username"] = username
        config["password"] = password
    return config


def load_local_proxy_environment() -> None:
    """Load only local Proxy-Seller variables; never print or persist their values."""
    env_file = Path(__file__).resolve().parents[2] / ".env.local"
    if not env_file.is_file():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.startswith("PROXY_SELLER_"):
            os.environ.setdefault(key, value)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract HTML size charts from direct retailer PDP URLs.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--monitor-path", required=True)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--delay-ms", type=int, default=1500)
    parser.add_argument("--timeout", type=int, default=35)
    parser.add_argument("--browser", default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    parser.add_argument("--proxy-server", help="Optional proxy server; defaults to PROXY_SELLER_PROXY_SERVER.")
    parser.add_argument("--proxy-username", help="Optional proxy username; defaults to PROXY_SELLER_PROXY_USERNAME.")
    parser.add_argument("--proxy-password", help="Optional proxy password; defaults to PROXY_SELLER_PROXY_PASSWORD.")
    return parser.parse_args()


if __name__ == "__main__":
    run(arguments())
