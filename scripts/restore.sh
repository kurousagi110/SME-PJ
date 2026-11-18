#!/usr/bin/env bash
set -euo pipefail

# Khôi phục MongoDB từ file sao lưu .archive.gz
# Cách dùng:
#   ./scripts/restore.sh backups/sme_backup_20261118_020000.archive.gz
#   ./scripts/restore.sh backups/sme_backup_20261118_020000.archive.gz --target-db=SME_restore_test

ARCHIVE_PATH="${1:-}"
TARGET_DB=""
SOURCE_DB="${SME_DB_NAME:-SME_db_mongo}"

if [ -z "$ARCHIVE_PATH" ] || [ ! -f "$ARCHIVE_PATH" ]; then
  echo "❌ Cách dùng: $0 <duong_dan_file.archive.gz> [--target-db=<ten_db_tam>]" >&2
  exit 1
fi

for arg in "${@:2}"; do
  case "$arg" in
    --target-db=*)
      TARGET_DB="${arg#--target-db=}"
      ;;
    *)
      echo "❌ Tham số không hợp lệ: $arg" >&2
      exit 1
      ;;
  esac
done

if ! gzip -t "$ARCHIVE_PATH" 2>/dev/null; then
  echo "❌ File sao lưu bị lỗi hoặc không phải định dạng gzip hợp lệ: $ARCHIVE_PATH" >&2
  exit 1
fi

# Tải biến môi trường từ .env nếu chưa có trong shell
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

RESTORE_ARGS=(--archive --gzip)
if [ -n "$TARGET_DB" ]; then
  echo "🔄 Khôi phục dữ liệu từ '${ARCHIVE_PATH}' sang DB '${TARGET_DB}' (từ '${SOURCE_DB}')..."
  RESTORE_ARGS+=(--nsFrom="${SOURCE_DB}.*" --nsTo="${TARGET_DB}.*" --drop)
else
  echo "🔄 Khôi phục dữ liệu từ '${ARCHIVE_PATH}' vào DB '${SOURCE_DB}' (ghi đè collection hiện tại với --drop)..."
  RESTORE_ARGS+=(--nsInclude="${SOURCE_DB}.*" --drop)
fi

if [ -n "${MONGO_URI:-}" ] && command -v mongorestore >/dev/null 2>&1; then
  mongorestore --uri="$MONGO_URI" "${RESTORE_ARGS[@]}" < "$ARCHIVE_PATH"
else
  : "${MONGO_ROOT_USERNAME:?Cần MONGO_ROOT_USERNAME trong môi trường hoặc .env}"
  : "${MONGO_ROOT_PASSWORD:?Cần MONGO_ROOT_PASSWORD trong môi trường hoặc .env}"
  docker compose exec -T db mongorestore \
    --username "$MONGO_ROOT_USERNAME" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    "${RESTORE_ARGS[@]}" < "$ARCHIVE_PATH"
fi

echo "✅ Khôi phục dữ liệu MongoDB thành công!"
