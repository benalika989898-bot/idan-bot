import argparse
import asyncio
import getpass
import sys
from typing import Any

import httpx

import bot


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Interactively create a Facebook session and save it to Supabase.",
    )
    parser.add_argument("--supabase-url", required=True)
    parser.add_argument("--service-role-key", required=True)
    parser.add_argument("--account-id")
    parser.add_argument("--email")
    parser.add_argument("--password")
    return parser.parse_args()


def log(message: str) -> None:
    print(message, flush=True)


def wait_for_twofa() -> None:
    input("Complete Facebook 2FA in the browser, then press Enter here...")


async def fetch_account(
    client: httpx.AsyncClient,
    supabase_url: str,
    service_role_key: str,
    account_id: str | None,
    email: str | None,
) -> dict[str, Any]:
    base_headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }

    if account_id:
        response = await client.get(
            f"{supabase_url}/rest/v1/accounts",
            params={"id": f"eq.{account_id}", "select": "*", "limit": "1"},
            headers=base_headers,
        )
    elif email:
        response = await client.get(
            f"{supabase_url}/rest/v1/accounts",
            params={"email": f"eq.{email}", "select": "*", "limit": "1"},
            headers=base_headers,
        )
    else:
        raise RuntimeError("Either --account-id or --email is required.")

    response.raise_for_status()
    data = response.json()
    if not data:
        raise RuntimeError("Account not found in Supabase.")
    return data[0]


async def save_session_state(
    client: httpx.AsyncClient,
    supabase_url: str,
    service_role_key: str,
    account_id: str,
    session_state: dict[str, Any],
) -> None:
    response = await client.patch(
        f"{supabase_url}/rest/v1/accounts",
        params={"id": f"eq.{account_id}"},
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json={"session_state": session_state},
    )
    response.raise_for_status()


async def main() -> int:
    args = parse_args()

    async with httpx.AsyncClient(timeout=30) as client:
        account = await fetch_account(
            client=client,
            supabase_url=args.supabase_url.rstrip("/"),
            service_role_key=args.service_role_key,
            account_id=args.account_id,
            email=args.email,
        )

        email = account["email"]
        password = args.password or account["password"] or getpass.getpass("Facebook password: ")
        if not password:
            raise RuntimeError("Facebook password is required.")

        log(f"Using account {account['id']} ({email})")
        log("Launching browser for manual Facebook login...")

        session_state, login_error = await bot.create_facebook_session(
            email=email,
            password=password,
            headless=False,
            log=log,
            twofa_callback=wait_for_twofa,
        )

        if not session_state:
            raise RuntimeError(login_error or "Login failed")

        await save_session_state(
            client=client,
            supabase_url=args.supabase_url.rstrip("/"),
            service_role_key=args.service_role_key,
            account_id=account["id"],
            session_state=session_state,
        )

        log("Saved session_state to Supabase.")
        return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        raise SystemExit(1)
