import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import threading
import asyncio
import bot
import config


class BotGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Facebook Group Bot")
        self.root.resizable(False, False)

        self.bot_thread = None
        self.stop_event = threading.Event()
        self.twofa_event = threading.Event()
        self.image_path = config.IMAGE_PATH or ""

        self._build_ui()

    def _build_ui(self):
        pad = {"padx": 8, "pady": 4}
        frame = ttk.Frame(self.root, padding=10)
        frame.grid(sticky="nsew")

        row = 0

        # --- Credentials ---
        ttk.Label(frame, text="Email:").grid(row=row, column=0, sticky="w", **pad)
        self.email_var = tk.StringVar(value=config.FB_EMAIL)
        ttk.Entry(frame, textvariable=self.email_var, width=50).grid(
            row=row, column=1, columnspan=2, sticky="ew", **pad
        )
        row += 1

        ttk.Label(frame, text="Password:").grid(row=row, column=0, sticky="w", **pad)
        self.password_var = tk.StringVar(value=config.FB_PASSWORD)
        ttk.Entry(frame, textvariable=self.password_var, show="*", width=50).grid(
            row=row, column=1, columnspan=2, sticky="ew", **pad
        )
        row += 1

        # --- Group URLs ---
        ttk.Label(frame, text="Group URLs\n(one per line):").grid(
            row=row, column=0, sticky="nw", **pad
        )
        self.groups_text = tk.Text(frame, width=50, height=5)
        self.groups_text.grid(row=row, column=1, columnspan=2, sticky="ew", **pad)
        self.groups_text.insert("1.0", "\n".join(config.GROUP_URLS))
        row += 1

        # --- Post Content ---
        ttk.Label(frame, text="Post Content:").grid(
            row=row, column=0, sticky="nw", **pad
        )
        self.post_text = tk.Text(frame, width=50, height=5)
        self.post_text.grid(row=row, column=1, columnspan=2, sticky="ew", **pad)
        self.post_text.insert("1.0", config.POST_TEXT)
        row += 1

        # --- Image ---
        ttk.Label(frame, text="Image:").grid(row=row, column=0, sticky="w", **pad)
        self.image_label = ttk.Label(
            frame, text=self.image_path or "(none)", width=40, anchor="w"
        )
        self.image_label.grid(row=row, column=1, sticky="w", **pad)
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=row, column=2, sticky="e", **pad)
        ttk.Button(btn_frame, text="Browse", command=self._browse_image).pack(
            side="left", padx=2
        )
        ttk.Button(btn_frame, text="Clear", command=self._clear_image).pack(
            side="left", padx=2
        )
        row += 1

        # --- Delays ---
        ttk.Label(frame, text="Min Delay (s):").grid(
            row=row, column=0, sticky="w", **pad
        )
        self.min_delay_var = tk.IntVar(value=config.MIN_DELAY)
        ttk.Spinbox(
            frame, textvariable=self.min_delay_var, from_=0, to=9999, width=10
        ).grid(row=row, column=1, sticky="w", **pad)
        row += 1

        ttk.Label(frame, text="Max Delay (s):").grid(
            row=row, column=0, sticky="w", **pad
        )
        self.max_delay_var = tk.IntVar(value=config.MAX_DELAY)
        ttk.Spinbox(
            frame, textvariable=self.max_delay_var, from_=0, to=9999, width=10
        ).grid(row=row, column=1, sticky="w", **pad)
        row += 1

        # --- Start / Stop ---
        self.start_btn = ttk.Button(
            frame, text="Start", command=self._toggle_bot
        )
        self.start_btn.grid(row=row, column=0, columnspan=3, pady=8)
        row += 1

        # --- Log panel ---
        ttk.Label(frame, text="Log:").grid(row=row, column=0, sticky="nw", **pad)
        self.log_text = tk.Text(frame, width=70, height=15)
        self.log_text.bind("<Key>", lambda e: "break" if e.keysym not in ("c", "a") or not (e.state & 0x8 or e.state & 0x4) else None)
        self.log_text.grid(row=row, column=0, columnspan=3, sticky="ew", **pad)
        scrollbar = ttk.Scrollbar(frame, command=self.log_text.yview)
        scrollbar.grid(row=row, column=3, sticky="ns")
        self.log_text.config(yscrollcommand=scrollbar.set)

    # --- helpers ---

    def _browse_image(self):
        path = filedialog.askopenfilename(
            filetypes=[("Images", "*.png *.jpg *.jpeg *.gif *.bmp *.webp")]
        )
        if path:
            self.image_path = path
            self.image_label.config(text=path)

    def _clear_image(self):
        self.image_path = ""
        self.image_label.config(text="(none)")

    def _log(self, message):
        """Thread-safe log append."""
        self.root.after(0, self._append_log, message)

    def _append_log(self, message):
        self.log_text.insert("end", message + "\n")
        self.log_text.see("end")

    def _twofa_prompt(self):
        """Called from bot thread; blocks until user clicks OK."""
        self.root.after(0, self._show_twofa_dialog)
        self.twofa_event.wait()
        self.twofa_event.clear()

    def _show_twofa_dialog(self):
        messagebox.showinfo(
            "2FA Required",
            "Complete 2FA in the browser, then click OK.",
        )
        self.twofa_event.set()

    def _gather_settings(self):
        groups_raw = self.groups_text.get("1.0", "end").strip()
        group_urls = [u.strip() for u in groups_raw.splitlines() if u.strip()]
        if not group_urls:
            messagebox.showerror("Error", "Enter at least one group URL.")
            return None
        return {
            "email": self.email_var.get().strip(),
            "password": self.password_var.get(),
            "group_urls": group_urls,
            "post_text": self.post_text.get("1.0", "end").strip(),
            "image_path": self.image_path or None,
            "min_delay": self.min_delay_var.get(),
            "max_delay": self.max_delay_var.get(),
        }

    def _toggle_bot(self):
        if self.bot_thread and self.bot_thread.is_alive():
            # Stop
            self.stop_event.set()
            self.start_btn.config(text="Start")
            self._log("[!] Stop requested...")
        else:
            # Start
            settings = self._gather_settings()
            if settings is None:
                return
            self.stop_event.clear()
            self.start_btn.config(text="Stop")
            self.bot_thread = threading.Thread(
                target=self._run_bot, args=(settings,), daemon=True
            )
            self.bot_thread.start()

    def _run_bot(self, settings):
        try:
            asyncio.run(
                bot.main(
                    settings=settings,
                    log=self._log,
                    stop_event=self.stop_event,
                    twofa_callback=self._twofa_prompt,
                )
            )
        except Exception as e:
            self._log(f"[!] Error: {e}")
        finally:
            self.root.after(0, lambda: self.start_btn.config(text="Start"))


def main():
    root = tk.Tk()
    BotGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
