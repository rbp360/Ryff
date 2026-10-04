import { NextResponse } from 'next/server';

export async function GET() {
  const csvContent = [
    'Date,Instrument,Event Type,Notes,Price',
    '2026-01-15,PRS Custom 24,strings,D\'Addario EXL110 Regular Light (10-46),',
    '2026-01-01,Washburn N2,setup,Action lowered and intonation set,',
    '2025-11-20,Boss Katana 50,note,Saved Lead patch to Channel 1,',
    '2024-05-10,Charvel 750XL,purchase,Bought used in very good condition,550',
  ].join('\r\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ryff_gear_passport_template.csv"',
    },
  });
}
