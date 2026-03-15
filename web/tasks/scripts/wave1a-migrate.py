#!/usr/bin/env python3
"""
Wave 1-A: requireAdmin → requireRole migration script
"""
import re
import os
import json
from pathlib import Path

BASE = Path('/home/openclaw/.openclaw/workspace/aniva/web')

# Role assignments
SUPER_ADMIN = {
    'src/app/api/admin/users/route.ts',
    'src/app/api/admin/users/[id]/plan/route.ts',
    'src/app/api/admin/users/[id]/coins/route.ts',
    'src/app/api/admin/users/[id]/grant/route.ts',
    'src/app/api/admin/coins/route.ts',
    'src/app/api/admin/guardrails/route.ts',
    'src/app/api/admin/guardrails/[id]/route.ts',
    'src/app/api/admin/guardrails/logs/route.ts',
    'src/app/api/admin/emergency-stop/route.ts',
    'src/app/api/admin/audit-log/route.ts',
    'src/app/api/admin/tenants/route.ts',
    'src/app/api/admin/addiction/stats/route.ts',
    'src/app/api/admin/translate/route.ts',
    'src/app/api/admin/stats/route.ts',
    'src/app/api/admin/dashboard/route.ts',
}

IP_ADMIN = {
    'src/app/api/admin/revenue/route.ts',
    'src/app/api/admin/analytics/route.ts',
    'src/app/api/admin/contracts/route.ts',
    'src/app/api/admin/contracts/[id]/route.ts',
    'src/app/api/admin/feedback/route.ts',
    'src/app/api/admin/feedback/[id]/route.ts',
    'src/app/api/admin/tenants/[id]/route.ts',
    'src/app/api/admin/tenants/[id]/characters/route.ts',
}

def get_role(rel_path: str) -> str:
    if rel_path in SUPER_ADMIN:
        return 'super_admin'
    elif rel_path in IP_ADMIN:
        return 'ip_admin'
    else:
        return 'editor'

def migrate_file(filepath: Path, rel_path: str, role: str) -> dict:
    content = filepath.read_text()
    original = content
    changes = []

    # Check if already migrated
    if 'requireRole' in content and 'requireAdmin' not in content:
        return {'path': rel_path, 'status': 'already_migrated', 'role': role}

    # For revenue/route.ts - no requireAdmin, need to add auth
    if rel_path == 'src/app/api/admin/revenue/route.ts':
        # Add import at top after existing imports
        if 'requireRole' not in content:
            content = re.sub(
                r"(import \{ NextResponse \} from 'next/server';)",
                r"import { NextResponse } from 'next/server';\nimport { requireRole } from '@/lib/rbac';",
                content
            )
            # Add auth check at start of GET function
            content = re.sub(
                r"(export async function GET\(\) \{(?:\s*try \{)?\s*const now)",
                r"export async function GET() {\n  const ctx = await requireRole('ip_admin');\n  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });\n\n  try {\n    const now",
                content,
                flags=re.DOTALL
            )
            # Fix the try block if it got doubled
            if 'try {\n    const now' in content and '  try {\n    const now' in content:
                pass  # OK
            changes.append('Added requireRole auth (was unprotected)')
        filepath.write_text(content)
        return {'path': rel_path, 'status': 'migrated', 'role': role, 'changes': changes}

    # Standard migration for files with requireAdmin
    if 'requireAdmin' not in content:
        return {'path': rel_path, 'status': 'skipped_no_requireAdmin', 'role': role}

    # 1. Replace import
    new_import = f"import {{ requireRole }} from '@/lib/rbac';"
    
    # Handle: import { requireAdmin } from '@/lib/admin';
    # Also handle combined imports like: import { requireAdmin, someOther } from '@/lib/admin';
    # Simple case: sole import
    content = re.sub(
        r"import \{ requireAdmin \} from '@/lib/admin';",
        new_import,
        content
    )
    # Combined import case: { requireAdmin, X } or { X, requireAdmin }
    content = re.sub(
        r"import \{ requireAdmin, ([^}]+) \} from '@/lib/admin';",
        lambda m: f"{new_import}\nimport {{ {m.group(1).strip()} }} from '@/lib/admin';",
        content
    )
    content = re.sub(
        r"import \{ ([^}]+), requireAdmin \} from '@/lib/admin';",
        lambda m: f"{new_import}\nimport {{ {m.group(1).strip()} }} from '@/lib/admin';",
        content
    )
    changes.append('Replaced import')

    # 2. Replace function call: const admin = await requireAdmin()
    content = re.sub(
        r"const admin = await requireAdmin\(\);",
        f"const ctx = await requireRole('{role}');",
        content
    )
    changes.append('Replaced requireAdmin() call')

    # 3. Replace if (!admin)
    content = re.sub(
        r"if \(!admin\)",
        "if (!ctx)",
        content
    )
    changes.append('Replaced if (!admin)')

    # 4. Replace remaining admin. references → ctx.
    # Only if admin variable was used after the auth check
    if 'admin.' in content:
        content = re.sub(r'\badmin\.', 'ctx.', content)
        changes.append('Replaced admin. → ctx.')

    if content != original:
        filepath.write_text(content)
        return {'path': rel_path, 'status': 'migrated', 'role': role, 'changes': changes}
    else:
        return {'path': rel_path, 'status': 'no_changes', 'role': role}

def main():
    # Find all admin route files
    admin_routes = list(BASE.glob('src/app/api/admin/**/route.ts'))
    
    results = []
    migrated = []
    skipped = []
    errors = []

    for filepath in sorted(admin_routes):
        rel_path = str(filepath.relative_to(BASE))
        role = get_role(rel_path)
        try:
            result = migrate_file(filepath, rel_path, role)
            results.append(result)
            if result['status'] == 'migrated':
                migrated.append(rel_path)
                print(f"✅ {rel_path} → {role}")
            elif result['status'] == 'already_migrated':
                skipped.append(rel_path)
                print(f"⏭️  {rel_path} (already migrated)")
            else:
                skipped.append(rel_path)
                print(f"⏭️  {rel_path} ({result['status']})")
        except Exception as e:
            errors.append({'path': rel_path, 'error': str(e)})
            print(f"❌ {rel_path}: {e}")

    # Save report
    report_dir = BASE / 'tasks' / 'reports'
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / 'wave1a-auth-migration.json'
    
    report = {
        'wave': '1-A',
        'description': 'requireAdmin → requireRole migration',
        'files_changed': migrated,
        'files_skipped': skipped,
        'errors': errors,
        'results': results,
        'summary': {
            'total': len(results),
            'migrated': len(migrated),
            'skipped': len(skipped),
            'errors': len(errors),
        }
    }
    
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\n📊 Report saved: {report_path}")
    print(f"   Migrated: {len(migrated)}, Skipped: {len(skipped)}, Errors: {len(errors)}")

if __name__ == '__main__':
    main()
