import asyncio
import random
import os
import tempfile
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

STATE_PATH = "state.json"
GROUP_PUBLISH_TIMEOUT_SECONDS = 180


async def random_delay(min_s=0.5, max_s=2.0):
    await asyncio.sleep(random.uniform(min_s, max_s))


async def human_type(page, selector, text):
    """Type text with random delays between keystrokes."""
    element = page.locator(selector)
    await element.click()
    await random_delay(0.3, 0.8)
    for char in text:
        await page.keyboard.type(char, delay=random.randint(50, 150))
        if random.random() < 0.05:
            await random_delay(0.3, 1.0)


async def random_mouse_movements(page):
    """Simulate random mouse movements to appear human."""
    for _ in range(random.randint(2, 5)):
        x = random.randint(100, 800)
        y = random.randint(100, 600)
        await page.mouse.move(x, y)
        await random_delay(0.1, 0.4)


async def random_scroll(page):
    """Scroll the page randomly to appear human."""
    for _ in range(random.randint(1, 3)):
        delta = random.randint(100, 400)
        await page.mouse.wheel(0, delta)
        await random_delay(0.5, 1.5)


async def login(page, settings, log, twofa_callback=None):
    """Log in to Facebook with email and password."""
    log("[*] Navigating to Facebook login...")
    await page.goto("https://www.facebook.com/", wait_until="domcontentloaded")
    await random_delay(1, 3)

    # Accept cookies dialog if present
    try:
        cookie_btn = page.locator(
            'button[data-cookiebanner="accept_button"], '
            'button:has-text("Allow all cookies"), '
            'button:has-text("Accept All")'
        )
        if await cookie_btn.count() > 0:
            await cookie_btn.first.click()
            await random_delay(1, 2)
    except Exception:
        pass

    log("[*] Entering credentials...")
    await page.fill('input[name="email"]', settings["email"])
    await random_delay(0.5, 1.5)
    await page.fill('input[name="pass"]', settings["password"])
    await random_delay(0.5, 1.0)
    await page.click('[aria-label="Log In"], [aria-label="log in"], button[name="login"]')

    # Wait for navigation after login
    try:
        await page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    await random_delay(3, 5)

    # Check for 2FA prompt
    if "checkpoint" in page.url or "two_step_verification" in page.url:
        log("[!] 2FA required.")
        if twofa_callback:
            await asyncio.get_event_loop().run_in_executor(None, twofa_callback)
        else:
            log("[!] Non-interactive mode cannot complete 2FA. Aborting login.")
            return False, "2FA required"
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        await random_delay(2, 4)

    # Verify login succeeded
    if "login" in page.url or "checkpoint" in page.url:
        log("[!] Login may have failed. Check the browser.")
        return False, f"Login blocked on {page.url}"

    # Navigate to homepage to fully establish session cookies
    try:
        await page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=30000)
    except Exception:
        pass
    await random_delay(5, 7)

    log("[+] Login successful!")
    return True, None


async def create_facebook_session(
    email: str,
    password: str,
    headless: bool,
    log,
    twofa_callback=None,
) -> tuple[dict | None, str | None]:
    """Create a Facebook browser session and return storage state."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )

        try:
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                locale="en-US",
            )

            page = await context.new_page()
            await Stealth().apply_stealth_async(page)

            success, login_error = await login(
                page,
                {"email": email, "password": password},
                log,
                twofa_callback=twofa_callback,
            )
            if not success:
                return None, login_error or "Login failed"

            session_state = await context.storage_state()
            return session_state, None
        finally:
            await browser.close()


async def publish_to_group(page, group_url, post_text, image_path, log):
    """Navigate to a group and publish a post. Returns (success, error_reason)."""
    log(f"[*] Navigating to group: {group_url}")
    navigation_error = None
    for attempt, wait_until in enumerate(("domcontentloaded", "load"), start=1):
        try:
            timeout_ms = 30000 if attempt == 1 else 45000
            await page.goto(group_url, wait_until=wait_until, timeout=timeout_ms)
            await random_delay(2, 3)
            try:
                await page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass
            navigation_error = None
            break
        except Exception as e:
            navigation_error = e
            log(
                f"[!] Navigation attempt {attempt} failed for {group_url}: {e}"
            )
            if attempt == 1:
                try:
                    await page.goto(
                        "https://www.facebook.com/",
                        wait_until="domcontentloaded",
                        timeout=30000,
                    )
                    await random_delay(1, 2)
                except Exception:
                    pass
                log("[*] Retrying group navigation with a longer timeout...")

    if navigation_error is not None:
        reason = f"Navigation timeout/error: {navigation_error}"
        log(f"[!] {reason}")
        return False, reason
    log(f"[*] Current URL: {page.url}")
    await random_delay(2, 4)

    # Simulate human behavior
    await random_mouse_movements(page)
    await random_scroll(page)
    await random_delay(1, 2)

    # Click the compose box ("Write something..." or similar)
    compose_selectors = [
        'span:has-text("Write something")',
        'span:has-text("Create a public post")',
        'span:has-text("What\'s on your mind")',
        'span:has-text("כתיבת משהו")',
        'span:has-text("Написать что-нибудь")',
        'div[role="button"]:has-text("Write something")',
    ]

    compose_clicked = False
    for selector in compose_selectors:
        try:
            locator = page.locator(selector)
            if await locator.count() > 0:
                await locator.first.click()
                compose_clicked = True
                log("[+] Compose box opened.")
                break
        except Exception:
            continue

    if not compose_clicked:
        log("[!] Could not find compose box. Trying fallback...")
        try:
            await page.click('div[contenteditable="true"]')
            compose_clicked = True
        except Exception:
            reason = "Failed to open compose box"
            log(f"[!] {reason}")
            return False, reason

    await random_delay(2, 4)

    # Wait for the compose dialog to appear
    try:
        await page.wait_for_selector('div[role="dialog"] div[contenteditable="true"]', timeout=10000)
    except Exception:
        reason = "Compose dialog did not appear"
        log(f"[!] {reason}")
        return False, reason

    # Type the post content in the editor
    try:
        editor = page.locator('div[role="dialog"] div[contenteditable="true"]')
        await editor.first.click()
        await random_delay(0.5, 1.0)

        # Type with human-like speed
        for char in post_text:
            await page.keyboard.type(char, delay=random.randint(30, 120))
            if random.random() < 0.03:
                await random_delay(0.2, 0.8)

        log("[+] Post text entered.")
    except Exception as e:
        reason = f"Failed to type post text: {e}"
        log(f"[!] {reason}")
        return False, reason

    await random_delay(1, 2)

    # Attach image if provided
    if image_path and os.path.isfile(image_path):
        try:
            # Use the file input directly (hidden input inside the dialog)
            file_input = page.locator('div[role="dialog"] input[type="file"][accept*="image"]')
            if await file_input.count() > 0:
                await file_input.first.set_input_files(image_path)
                log("[+] Image attached.")
                await random_delay(2, 4)
            else:
                # Click Photo/video button first to reveal file input
                photo_btn = page.locator('[aria-label="Photo/video"], [aria-label="Photo/Video"]')
                if await photo_btn.count() > 0:
                    await photo_btn.first.click()
                    await random_delay(1, 2)
                    file_input = page.locator('input[type="file"][accept*="image"]')
                    await file_input.first.set_input_files(image_path)
                    log("[+] Image attached.")
                    await random_delay(2, 4)
        except Exception as e:
            log(f"[!] Failed to attach image: {e}")

    # Click Post button
    await random_delay(1, 2)
    try:
        post_btn = page.locator('div[role="dialog"] [aria-label="Post"]')
        if await post_btn.count() == 0:
            post_btn = page.locator('div[role="dialog"] div[role="button"]:has-text("Post")')
        if await post_btn.count() > 0:
            await post_btn.first.click()
            log("[+] Post button clicked!")
            try:
                await page.wait_for_selector('div[role="dialog"]', state="hidden", timeout=45000)
                log("[+] Post dialog closed.")
            except Exception:
                log("[*] Post dialog still open after clicking Post; continuing with cleanup.")
            await random_delay(3, 6)
            return True, None
    except Exception as e:
        reason = f"Error clicking Post: {e}"
        log(f"[!] {reason}")
        return False, reason

    reason = "Could not find Post button"
    log(f"[!] {reason}")
    return False, reason


async def close_open_dialogs(page, log):
    """Best-effort cleanup so a failed publish does not poison the next group."""
    selectors = [
        'div[role="dialog"] [aria-label="Close"]',
        'div[role="dialog"] [aria-label="סגור"]',
        'div[role="dialog"] [aria-label="Cancel"]',
        'div[role="dialog"] [aria-label="ביטול"]',
    ]

    for selector in selectors:
        try:
            locator = page.locator(selector)
            if await locator.count() > 0:
                await locator.first.click()
                await random_delay(0.5, 1.0)
                return
        except Exception:
            continue

    try:
        await page.keyboard.press("Escape")
        await random_delay(0.5, 1.0)
    except Exception:
        log("[!] Failed to dismiss any open publish dialog.")


async def prepare_group_page(context, log):
    """Open a fresh page per group so leftover UI state does not block the next publish."""
    page = await context.new_page()
    await Stealth().apply_stealth_async(page)
    try:
        await page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=30000)
        await random_delay(1, 2)
    except Exception as exc:
        log(f"[*] Failed to warm up fresh page: {exc}")
    return page


async def download_image(url: str) -> str | None:
    """Download an image from a URL to a temp file. Returns the temp file path."""
    import httpx

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, timeout=30)
            resp.raise_for_status()
            # Determine extension from content-type
            content_type = resp.headers.get("content-type", "")
            ext = ".jpg"
            if "png" in content_type:
                ext = ".png"
            elif "gif" in content_type:
                ext = ".gif"
            elif "webp" in content_type:
                ext = ".webp"
            tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
            tmp.write(resp.content)
            tmp.close()
            return tmp.name
    except Exception:
        return None


async def execute_post(
    account_email: str,
    account_password: str,
    session_state: dict | None,
    groups: list[dict],
    content: str,
    image_url: str | None = None,
) -> dict:
    """
    Execute a post to one or more Facebook groups.
    Called by the HTTP API server.

    Returns:
        {
            "results": [{"group_url": str, "success": bool, "error": str|None}],
            "updated_session_state": dict|None
        }
    """
    log_lines = []

    def log(msg):
        log_lines.append(msg)
        print(msg, flush=True)

    # Download image if URL provided
    temp_image_path = None
    if image_url:
        temp_image_path = await download_image(image_url)
        if temp_image_path:
            log(f"[+] Image downloaded to {temp_image_path}")
        else:
            log(f"[!] Failed to download image from {image_url}")

    results = []
    updated_session_state = None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                ],
            )

            context_kwargs = {
                "viewport": {"width": 1280, "height": 800},
                "user_agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "locale": "en-US",
            }

            needs_login = session_state is None
            try:
                context = await browser.new_context(
                    storage_state=session_state if session_state else None,
                    **context_kwargs,
                )
            except Exception as exc:
                log(f"[!] Failed to load saved session state: {exc}")
                context = await browser.new_context(**context_kwargs)
                needs_login = True

            page = await prepare_group_page(context, log)

            if not needs_login:
                log("[*] Verifying saved session...")
                await page.goto("https://www.facebook.com/", wait_until="domcontentloaded")
                await random_delay(2, 4)
                if "login" in page.url:
                    log("[!] Session expired, re-logging in...")
                    needs_login = True

            if needs_login:
                settings = {"email": account_email, "password": account_password}
                success, login_error = await login(page, settings, log)
                if not success:
                    await browser.close()
                    return {
                        "results": [{"group_url": g["url"], "success": False, "error": login_error or "Login failed"} for g in groups],
                        "updated_session_state": None,
                    }

            for i, group in enumerate(groups):
                group_url = group["url"]
                group_page = page if i == 0 else await prepare_group_page(context, log)
                try:
                    success, error_reason = await asyncio.wait_for(
                        publish_to_group(group_page, group_url, content, temp_image_path, log),
                        timeout=GROUP_PUBLISH_TIMEOUT_SECONDS,
                    )
                    results.append({"group_url": group_url, "success": success, "error": error_reason})
                except asyncio.TimeoutError:
                    timeout_reason = (
                        f"Timed out after {GROUP_PUBLISH_TIMEOUT_SECONDS}s while publishing"
                    )
                    log(f"[!] {timeout_reason} to {group_url}")
                    results.append(
                        {"group_url": group_url, "success": False, "error": timeout_reason}
                    )
                except Exception as e:
                    results.append({"group_url": group_url, "success": False, "error": str(e)})

                await close_open_dialogs(group_page, log)

                if group_page is not page:
                    await group_page.close()

                if i < len(groups) - 1:
                    delay = random.uniform(30, 90)
                    log(f"[*] Waiting {delay:.0f}s before next group...")
                    await asyncio.sleep(delay)

            try:
                updated_session_state = await context.storage_state()
            except Exception as exc:
                log(f"[!] Failed to persist session state: {exc}")
                updated_session_state = None

            await page.close()
            await browser.close()
    finally:
        if temp_image_path and os.path.isfile(temp_image_path):
            os.unlink(temp_image_path)

    return {
        "results": results,
        "updated_session_state": updated_session_state,
    }


async def execute_login(email: str, password: str) -> dict:
    """
    Log in to Facebook and return the session state.
    Called by the HTTP API server.
    """
    log_lines = []

    def log(msg):
        log_lines.append(msg)
        print(msg, flush=True)

    session_state, login_error = await create_facebook_session(
        email=email,
        password=password,
        headless=True,
        log=log,
    )

    return {
        "success": session_state is not None,
        "session_state": session_state,
        "error": login_error,
    }


# ── Legacy GUI entrypoint (unchanged) ─────────────────────────
async def main(settings=None, log=None, stop_event=None, twofa_callback=None):
    if settings is None:
        import config
        settings = {
            "email": config.FB_EMAIL,
            "password": config.FB_PASSWORD,
            "group_urls": config.GROUP_URLS,
            "post_text": config.POST_TEXT,
            "image_path": config.IMAGE_PATH,
            "min_delay": config.MIN_DELAY,
            "max_delay": config.MAX_DELAY,
        }
    if log is None:
        log = print

    async with async_playwright() as p:
        # Check if saved session exists
        has_state = os.path.isfile(STATE_PATH)

        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )

        context = await browser.new_context(
            storage_state=STATE_PATH if has_state else None,
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )

        page = await context.new_page()
        await Stealth().apply_stealth_async(page)

        # Login if no saved session
        if not has_state:
            success = await login(page, settings, log, twofa_callback)
            if not success:
                log("[!] Exiting due to login failure.")
                await browser.close()
                return
            # Save session state
            await context.storage_state(path=STATE_PATH)
            log("[+] Session saved to state.json")
        else:
            log("[+] Loaded saved session from state.json")
            # Verify session is still valid
            await page.goto("https://www.facebook.com/", wait_until="domcontentloaded")
            await random_delay(2, 4)
            if "login" in page.url:
                log("[!] Saved session expired. Logging in again...")
                success = await login(page, settings, log, twofa_callback)
                if not success:
                    log("[!] Exiting due to login failure.")
                    await browser.close()
                    return
                await context.storage_state(path=STATE_PATH)

        # Publish to each group
        group_urls = settings["group_urls"]
        log(f"[*] {len(group_urls)} group(s) to post in: {group_urls}")
        results = []
        for i, group_url in enumerate(group_urls):
            if stop_event and stop_event.is_set():
                log("[!] Stopped by user.")
                break

            log(f"\n--- Group {i + 1}/{len(group_urls)} ---")
            success, _error = await publish_to_group(
                page, group_url, settings["post_text"], settings["image_path"], log
            )
            results.append((group_url, success))

            if i < len(group_urls) - 1:
                delay = random.uniform(settings["min_delay"], settings["max_delay"])
                log(f"[*] Waiting {delay:.0f}s before next group...")
                # Sleep in small increments so stop_event can interrupt
                elapsed = 0.0
                while elapsed < delay:
                    if stop_event and stop_event.is_set():
                        break
                    await asyncio.sleep(min(1.0, delay - elapsed))
                    elapsed += 1.0

        # Summary
        log("\n=== Results ===")
        for url, success in results:
            status = "SUCCESS" if success else "FAILED"
            log(f"  [{status}] {url}")

        # Save updated session
        await context.storage_state(path=STATE_PATH)
        await browser.close()
        log("\n[+] Done.")


if __name__ == "__main__":
    asyncio.run(main())
