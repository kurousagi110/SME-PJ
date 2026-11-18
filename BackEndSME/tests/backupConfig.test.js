import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Automated MongoDB Backup & Restore Configuration", () => {
  it("defines the backup service with retention and volume in docker-compose.yml", () => {
    const compose = fs.readFileSync(path.join(ROOT, "docker-compose.yml"), "utf8");
    assert.match(compose, /^\s{2}backup:/m);
    assert.match(compose, /container_name:\s*sme_backup/);
    assert.match(compose, /BACKUP_CRON:/);
    assert.match(compose, /BACKUP_RETENTION_DAYS:/);
    assert.match(compose, /\.\/backups:\/backups/);
  });

  it("validates bash syntax for backup and restore scripts", () => {
    const backupScript = path.join(ROOT, "scripts/mongo-backup.sh");
    const restoreScript = path.join(ROOT, "scripts/restore.sh");
    assert.equal(fs.existsSync(backupScript), true);
    assert.equal(fs.existsSync(restoreScript), true);

    execFileSync("bash", ["-n", backupScript]);
    execFileSync("bash", ["-n", restoreScript]);
  });
});
