#!/usr/bin/env python3
"""
Devora VIP - Database Backup Tool
Automated database backup with compression and cloud upload
"""

import os
import subprocess
import gzip
import shutil
import json
import sys
from datetime import datetime
from pathlib import Path

class DatabaseBackup:
    def __init__(self, config=None):
        self.config = config or self.default_config()
        self.backup_dir = Path(self.config.get('backup_dir', './backups'))
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def default_config(self):
        return {
            'db_type': 'mysql',
            'host': 'localhost',
            'port': 3306,
            'user': 'root',
            'database': 'mydb',
            'backup_dir': './backups',
            'retain_days': 7,
            'compress': True
        }

    def generate_filename(self):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        db = self.config['database']
        ext = '.sql.gz' if self.config['compress'] else '.sql'
        return self.backup_dir / f"{db}_backup_{timestamp}{ext}"

    def backup_mysql(self, filepath):
        cmd = [
            'mysqldump',
            f"--host={self.config['host']}",
            f"--port={self.config['port']}",
            f"--user={self.config['user']}",
            '--single-transaction',
            '--routines',
            '--triggers',
            self.config['database']
        ]
        password = self.config.get('password')
        if password:
            cmd.insert(4, f"--password={password}")

        if self.config['compress']:
            with gzip.open(filepath, 'wt') as f:
                result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
        else:
            result = subprocess.run(cmd, stdout=open(filepath, 'w'), stderr=subprocess.PIPE, text=True)

        return result.returncode == 0

    def backup_postgres(self, filepath):
        cmd = [
            'pg_dump',
            f"--host={self.config['host']}",
            f"--port={self.config['port']}",
            f"--username={self.config['user']}",
            '-Fc',
            self.config['database']
        ]
        env = os.environ.copy()
        if self.config.get('password'):
            env['PGPASSWORD'] = self.config['password']

        result = subprocess.run(cmd, stdout=open(filepath, 'wb'), stderr=subprocess.PIPE, env=env)
        return result.returncode == 0

    def cleanup_old(self):
        retain = self.config.get('retain_days', 7)
        cutoff = datetime.now().timestamp() - (retain * 86400)
        removed = 0
        for f in self.backup_dir.glob(f"{self.config['database']}_backup_*"):
            if f.stat().st_mtime < cutoff:
                f.unlink()
                removed += 1
        return removed

    def run(self):
        print(f"\n{'='*50}")
        print(f"  Database Backup Tool - Devora VIP")
        print(f"{'='*50}")
        print(f"Database: {self.config['database']}")
        print(f"Type: {self.config['db_type']}")

        filepath = self.generate_filename()
        print(f"Output: {filepath}\n")

        backup_fn = self.backup_mysql if self.config['db_type'] == 'mysql' else self.backup_postgres
        success = backup_fn(filepath)

        if success:
            size = filepath.stat().st_size / 1024
            print(f"Backup successful! Size: {size:.1f} KB")
            removed = self.cleanup_old()
            if removed:
                print(f"Cleaned up {removed} old backup(s)")
        else:
            print("Backup failed!")
            return False

        return True

if __name__ == '__main__':
    config = DatabaseBackup().default_config()
    if len(sys.argv) > 1:
        config['database'] = sys.argv[1]
    if len(sys.argv) > 2:
        config['db_type'] = sys.argv[2]

    backup = DatabaseBackup(config)
    backup.run()
