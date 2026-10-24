import { NextResponse } from 'next/server';
import { databasePool } from '@/lib/store.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!process.env.DATABASE_URL || !process.env.SITE_ORIGIN) return NextResponse.json({status:'unavailable'},{status:503});
  try {
    const pool = await databasePool();
    const result = await pool.query('SELECT 1 FROM screenly_state WHERE id=1');
    if (result.rowCount !== 1) throw new Error('Uninitialized');
    return NextResponse.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({status:'unavailable'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
