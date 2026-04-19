# VPS Deployment

## Before Anything Else

1. Revoke the GitHub Personal Access Token that was pasted into chat.
2. Change the Facebook password that appears in `config.py`.
3. Do not paste secrets into terminal commands or commit them to git.

## If SSH Shows `>`

That means the shell is waiting for more input because a previous command was incomplete.

Press `Ctrl+C` once to cancel it and get back to a normal prompt before running anything else.

## Create The Systemd Environment File

Run this on the VPS:

```bash
printf '%s\n' 'BOT_SERVER_SECRET=benalonarg2611' | sudo tee /etc/idan-bot.env >/dev/null
sudo chmod 600 /etc/idan-bot.env
```

Replace `replace-this-with-a-random-secret` with a long random string.
BOT_SERVER_SECRET=gKh6VcKKzKg2Er5gNlGINlqO-\_MhUxNfBwWtwKI5S-M
supabase secrets set BOT_SERVER_URL=http://34.56.191.222:8000 BOT_SERVER_SECRET=gKh6VcKKzKg2Er5gNlGINlqO-\_MhUxNfBwWtwKI5S-M FUNCTION_SECRET=BztqVSch7QOVwyt-cnvJbl7xjVkNj6B1cYfDxmS1Too

## Install The Service File

supabase secrets set BOT_SERVER_URL=http://34.56.191.222:8000 BOT_SERVER_SECRET=gKh6VcKKzKg2Er5gNlGINlqO-\_MhUxNfBwWtwKI5S-M

curl -X POST https://qjljczhszqxuhogjvuln.supabase.co/functions/v1/process-scheduled-posts \
 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbGpjemhzenF4dWhvZ2p2dWxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUzMTkyMiwiZXhwIjoyMDkyMTA3OTIyfQ.t2lHg8bYAyR-2z-ruEqum0Zm4g8JkrdBdPM0j1iF9MA"

Run this on the VPS:

curl -X POST https://qjljczhszqxuhogjvuln.supabase.co/functions/v1/process-scheduled-posts \
 -H "Authorization: Bearer BztqVSch7QOVwyt-cnvJbl7xjVkNj6B1cYfDxmS1Too"
supabase secrets set FUNCTION_SECRET=BztqVSch7QOVwyt-cnvJbl7xjVkNj6B1cYfDxmS1Too

```bash
sudo install -D -m 644 ~/idan-bot/deploy/idan-bot.service /etc/systemd/system/idan-bot.service
sudo systemctl daemon-reload
sudo systemctl enable idan-bot
sudo systemctl start idan-bot
sudo systemctl status idan-bot --no-pager
```

If `status` shows `active (running)`, the service is up.

## Useful Commands

Check logs:

```bash
sudo journalctl -u idan-bot -n 100 --no-pager
```

Restart after code changes:

```bash
cd ~/idan-bot
git pull
sudo systemctl restart idan-bot
sudo systemctl status idan-bot --no-pager
```

Test the health endpoint from the VPS:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{ "status": "ok" }
```
