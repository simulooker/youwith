"""Server-side notice collection job; schedule with a hosting scheduler or systemd timer."""
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KST = timezone(timedelta(hours=9))


def run(root=ROOT):
    started = datetime.now(KST)
    log_dir = root / "temp" / "notice-refresh"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / (started.strftime("%Y-%m-%d_%H%M%S") + ".log")
    status_path = root / "db" / "notice-schedule-status.json"
    status_path.parent.mkdir(parents=True, exist_ok=True)
    status = {"startedAt":started.isoformat(timespec="seconds"), "status":"running",
              "log":str(log_path.relative_to(root)), "sources":[]}

    def save():
        temporary = status_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(status_path)

    save()
    exit_code = 1
    with log_path.open("w", encoding="utf-8") as log:
        try:
            result = subprocess.run([sys.executable, "-X", "utf8", str(root / "server" / "refresh_notices.py")],
                                    cwd=root, stdout=log, stderr=subprocess.STDOUT, timeout=3300,
                                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            exit_code = result.returncode
            if exit_code:
                raise RuntimeError(f"Collector exited with code {exit_code}")
            data = json.loads((root / "frontend" / "notices.json").read_text(encoding="utf-8"))
            for source in data["sources"]:
                notices = source.get("notices", [])
                status["sources"].append({
                    "id":source["id"], "status":source.get("status"),
                    "checkedAt":source.get("checkedAt"), "errors":source.get("errors", []),
                    "counts":{key:sum(item.get("status") == key for item in notices)
                              for key in ("open", "upcoming", "unknown")}})
            # The collector retains last known data on individual source failures.
            partial = any(source["errors"] or source["status"] == "unverified" for source in status["sources"])
            status["status"] = "partial" if partial else "success"
            exit_code = 1 if partial else 0
        except (OSError, ValueError, KeyError, TypeError, RuntimeError, subprocess.TimeoutExpired) as error:
            status["status"] = "failed"
            status["error"] = str(error)
            log.write("\nScheduled refresh failed: " + str(error) + "\n")
            exit_code = 1
        finally:
            status["finishedAt"] = datetime.now(KST).isoformat(timespec="seconds")
            save()
    return exit_code


if __name__ == "__main__":
    raise SystemExit(run())
