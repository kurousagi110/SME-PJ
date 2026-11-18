#!/usr/bin/env bash
set -euo pipefail

# Tự động sao lưu MongoDB bằng mongodump (--archive --gzip) và xoay vòng bản cũ.
# Dùng được cả ở chế độ daemon trong Docker (BACKUP_CRON) và chạy 1 lần (--once).

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_CRON="${BACKUP_CRON:-0 2 * * *}"

if [ -z "${MONGO_URI:-}" ]; then
  echo "❌ [Backup] Thiếu biến môi trường MONGO_URI" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

run_backup() {
  local ts
  ts="$(date +%Y%m%d_%H%M%S)"
  local target_file="${BACKUP_DIR}/sme_backup_${ts}.archive.gz"
  local tmp_file="${target_file}.tmp"

  echo "📦 [Backup] Bắt đầu sao lưu MongoDB -> ${target_file}"
  if mongodump --uri="$MONGO_URI" --archive="$tmp_file" --gzip --quiet; then
    if [ -s "$tmp_file" ] && gzip -t "$tmp_file" 2>/dev/null; then
      mv "$tmp_file" "$target_file"
      echo "✅ [Backup] Hoàn tất: ${target_file} ($(du -h "$target_file" | cut -f1))"
    else
      rm -f "$tmp_file"
      echo "❌ [Backup] File sao lưu rỗng hoặc hỏng" >&2
      return 1
    fi
  else
    rm -f "$tmp_file"
    echo "❌ [Backup] mongodump thất bại" >&2
    return 1
  fi

  # Xoay vòng: xóa bản sao lưu cũ quá RETENTION_DAYS ngày
  find "$BACKUP_DIR" -maxdepth 1 -type f -name "sme_backup_*.archive.gz" -mtime +"$RETENTION_DAYS" -print -delete || true
}

matches_cron_field() {
  local expr="$1"
  local val="$2"
  val=$((10#$val))

  if [ "$expr" = "*" ]; then
    return 0
  fi
  if [[ "$expr" == \*/[0-9]* ]]; then
    local step="${expr#*/}"
    [ "$step" -gt 0 ] && [ $((val % step)) -eq 0 ]
    return $?
  fi
  IFS=',' read -ra parts <<< "$expr"
  for part in "${parts[@]}"; do
    if [[ "$part" =~ ^[0-9]+$ ]] && [ "$((10#$part))" -eq "$val" ]; then
      return 0
    fi
  done
  return 1
}

should_run_now() {
  local c_min c_hour c_dom c_mon c_dow
  read -r c_min c_hour c_dom c_mon c_dow <<< "$BACKUP_CRON"
  local now_min now_hour now_dom now_mon now_dow
  now_min="$(date +%M)"
  now_hour="$(date +%H)"
  now_dom="$(date +%d)"
  now_mon="$(date +%m)"
  now_dow="$(date +%u)" # 1..7 (7 = Sunday)
  [ "$now_dow" = "7" ] && now_dow_alt="0" || now_dow_alt="$now_dow"

  matches_cron_field "$c_min" "$now_min" \
    && matches_cron_field "$c_hour" "$now_hour" \
    && matches_cron_field "$c_dom" "$now_dom" \
    && matches_cron_field "$c_mon" "$now_mon" \
    && { matches_cron_field "$c_dow" "$now_dow" || matches_cron_field "$c_dow" "$now_dow_alt"; }
}

if [ "${1:-}" = "--once" ]; then
  run_backup
  exit 0
fi

echo "🕒 [Backup] Khởi chạy scheduler sao lưu tự động (cron='${BACKUP_CRON}', giữ ${RETENTION_DAYS} ngày)"
last_minute=""

while true; do
  cur_minute="$(date +%Y%m%d%H%M)"
  if [ "$cur_minute" != "$last_minute" ]; then
    last_minute="$cur_minute"
    if should_run_now; then
      run_backup || true
    fi
  fi
  sleep 20
done
