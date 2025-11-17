#!/usr/bin/env python3
"""Generate a JSON snapshot for a GitHub organisation to power a static landing page."""

from __future__ import annotations

import argparse
import collections
import json
import os
import sys
import time
from typing import Dict, Iterable, List, Optional

import requests

API_ROOT = "https://api.github.com"
API_VERSION = "2022-11-28"
DEFAULT_MAX_REPOS = 50


class GitHubClient:
    """Thin wrapper around the GitHub REST API with optional retries and pagination."""

    def __init__(self, token: Optional[str] = None, retries: int = 2, timeout: int = 30) -> None:
        self.session = requests.Session()
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "divengine-org-snapshot",
            "X-GitHub-Api-Version": API_VERSION,
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self.session.headers.update(headers)
        self.retries = max(1, retries)
        self.timeout = timeout

    def request(self, method: str, path: str, params: Optional[dict] = None) -> dict:
        url = f"{API_ROOT}{path}"
        last_error = None
        for attempt in range(1, self.retries + 1):
            response = self.session.request(method, url, params=params, timeout=self.timeout)
            if response.ok:
                if response.headers.get("Content-Type", "").startswith("application/json"):
                    return response.json()
                raise ValueError(f"Unexpected content type for {path}: {response.headers.get('Content-Type')}")
            last_error = self._build_error(response)
            if response.status_code == 403 and response.headers.get("X-RateLimit-Remaining") == "0":
                reset_epoch = response.headers.get("X-RateLimit-Reset")
                wait_seconds = max(0, int(reset_epoch) - int(time.time())) if reset_epoch else 0
                raise RuntimeError(
                    f"Rate limit exceeded. Try again in {wait_seconds} seconds or use a token. Details: {last_error}"
                )
            if attempt < self.retries:
                time.sleep(1.5 * attempt)
        raise RuntimeError(last_error or f"Unknown error invoking {path}")

    def paginate(self, path: str, params: Optional[dict] = None) -> Iterable[dict]:
        page = 1
        while True:
            paged = dict(params or {})
            paged.update({"per_page": 100, "page": page})
            chunk = self.request("GET", path, paged)
            if not isinstance(chunk, list):
                return
            if not chunk:
                return
            for item in chunk:
                yield item
            if len(chunk) < paged["per_page"]:
                return
            page += 1

    @staticmethod
    def _build_error(response: requests.Response) -> str:
        detail = ""
        try:
            payload = response.json()
            message = payload.get("message")
            if message:
                detail = message
        except ValueError:
            detail = response.text.strip()
        return f"{response.status_code} {response.reason}: {detail}"


def summarise_languages(payload: Dict[str, int]) -> List[dict]:
    total = sum(payload.values())
    ordered = sorted(payload.items(), key=lambda item: item[1], reverse=True)
    summary = []
    for name, bytes_count in ordered:
        share = round((bytes_count / total) * 100, 2) if total else 0.0
        summary.append({"name": name, "bytes": bytes_count, "share": share})
    return summary


def fetch_repo_topics(client: GitHubClient, org: str, repo: str) -> List[str]:
    path = f"/repos/{org}/{repo}/topics"
    result = client.request("GET", path)
    topics = result.get("names") if isinstance(result, dict) else []
    return topics or []


def fetch_repo_languages(client: GitHubClient, org: str, repo: str) -> Dict[str, int]:
    path = f"/repos/{org}/{repo}/languages"
    result = client.request("GET", path)
    if isinstance(result, dict):
        return result
    return {}


def fetch_repo_contributors(client: GitHubClient, org: str, repo: str, limit: int = 5) -> List[dict]:
    path = f"/repos/{org}/{repo}/contributors"
    contributors = []
    for entry in client.paginate(path):
        contributors.append(
            {
                "login": entry.get("login"),
                "html_url": entry.get("html_url"),
                "contributions": entry.get("contributions"),
            }
        )
        if len(contributors) >= limit:
            break
    return contributors


def build_snapshot(org: str, client: GitHubClient, max_repos: int) -> dict:
    org_data = client.request("GET", f"/orgs/{org}")
    repositories = []
    language_totals = collections.Counter()
    repo_count = 0
    for repo in client.paginate(f"/orgs/{org}/repos", params={"type": "public", "sort": "updated"}):
        repo_count += 1
        languages = fetch_repo_languages(client, org, repo["name"])
        language_totals.update(languages)
        repositories.append(
            {
                "name": repo["name"],
                "full_name": repo.get("full_name"),
                "description": repo.get("description"),
                "html_url": repo.get("html_url"),
                "homepage": repo.get("homepage"),
                "pushed_at": repo.get("pushed_at"),
                "updated_at": repo.get("updated_at"),
                "created_at": repo.get("created_at"),
                "stargazers_count": repo.get("stargazers_count"),
                "forks_count": repo.get("forks_count"),
                "watchers_count": repo.get("watchers_count"),
                "open_issues_count": repo.get("open_issues_count"),
                "default_branch": repo.get("default_branch"),
                "topics": repo.get("topics") or fetch_repo_topics(client, org, repo["name"]),
                "primary_language": repo.get("language"),
                "languages": summarise_languages(languages),
                "top_contributors": fetch_repo_contributors(client, org, repo["name"]),
            }
        )
        if max_repos and repo_count >= max_repos:
            break
    repositories.sort(key=lambda item: (item["stargazers_count"] or 0, item["forks_count"] or 0), reverse=True)
    aggregate_languages = summarise_languages(dict(language_totals))
    snapshot = {
        "organization": {
            "login": org_data.get("login"),
            "name": org_data.get("name"),
            "description": org_data.get("description"),
            "blog": org_data.get("blog"),
            "location": org_data.get("location"),
            "email": org_data.get("email"),
            "twitter_username": org_data.get("twitter_username"),
            "public_repos": org_data.get("public_repos"),
            "followers": org_data.get("followers"),
            "following": org_data.get("following"),
            "created_at": org_data.get("created_at"),
            "updated_at": org_data.get("updated_at"),
            "html_url": org_data.get("html_url"),
            "avatar_url": org_data.get("avatar_url"),
        },
        "repositories": repositories,
        "stats": {
            "repository_count": len(repositories),
            "total_public_repos": org_data.get("public_repos"),
            "total_stars": sum((repo.get("stargazers_count") or 0) for repo in repositories),
            "total_forks": sum((repo.get("forks_count") or 0) for repo in repositories),
            "languages": aggregate_languages,
        },
    }
    return snapshot


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export public information about a GitHub organisation to JSON.")
    parser.add_argument("org", help="GitHub organisation login (e.g. divengine)")
    parser.add_argument(
        "-o",
        "--output",
        default="org_snapshot.json",
        help="Destination JSON file (default: %(default)s)",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("GITHUB_TOKEN"),
        help="GitHub personal access token (optional, improves rate limits)",
    )
    parser.add_argument(
        "--max-repos",
        type=int,
        default=DEFAULT_MAX_REPOS,
        help=f"Maximum number of repositories to capture (default: {DEFAULT_MAX_REPOS})",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    if args.max_repos is not None and args.max_repos < 1:
        raise SystemExit("--max-repos must be a positive integer")
    client = GitHubClient(token=args.token)
    snapshot = build_snapshot(args.org, client, args.max_repos)
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, ensure_ascii=False, indent=2)
    print(f"Wrote snapshot for '{args.org}' to {args.output}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit("Aborted by user")
