/* global process, console */
import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const db = postgres(process.env.DATABASE_URL, { ssl: 'require' });

const expectedColumns = [
  { tableName: 'generated_documents', columnName: 'source_revision' },
  { tableName: 'order_shipments', columnName: 'operational_document_revision' },
];

const hardGateColumns = [
  'missing_generated_documents_source_revision',
  'missing_order_shipments_operational_document_revision',
];

const query = `
WITH expected_columns AS (
  SELECT *
  FROM (
    VALUES
      ('generated_documents', 'source_revision'),
      ('order_shipments', 'operational_document_revision')
  ) AS v(table_name, column_name)
),
present_columns AS (
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (table_name, column_name) IN (
      ('generated_documents', 'source_revision'),
      ('order_shipments', 'operational_document_revision')
    )
),
missing_columns AS (
  SELECT e.table_name, e.column_name
  FROM expected_columns e
  LEFT JOIN present_columns p
    ON p.table_name = e.table_name
   AND p.column_name = e.column_name
  WHERE p.column_name IS NULL
)
SELECT
  COUNT(*) FILTER (
    WHERE table_name = 'generated_documents' AND column_name = 'source_revision'
  )::int AS missing_generated_documents_source_revision,
  COUNT(*) FILTER (
    WHERE table_name = 'order_shipments' AND column_name = 'operational_document_revision'
  )::int AS missing_order_shipments_operational_document_revision
FROM missing_columns;
`;

try {
  const rows = await db.unsafe(query);
  const row = rows[0];
  if (!row) {
    console.error('Document schema gate query returned no rows.');
    process.exit(1);
  }

  const payload = {
    gateName: 'document-schema-gates',
    generatedAt: new Date().toISOString(),
    requiredColumns: expectedColumns,
    hardGates: Object.fromEntries(
      hardGateColumns.map((column) => [column, Number(row[column] ?? 0)])
    ),
    metrics: Object.fromEntries(
      hardGateColumns.map((column) => [column, Number(row[column] ?? 0)])
    ),
  };

  console.log(JSON.stringify(payload, null, 2));

  const failing = hardGateColumns.filter((column) => Number(row[column] ?? 0) > 0);
  if (failing.length > 0) {
    console.error(`Document schema do-not-ship gates failed: ${failing.join(', ')}`);
    process.exit(2);
  }

  console.log('Document schema hard gates: PASS');
} finally {
  await db.end({ timeout: 5 });
}
