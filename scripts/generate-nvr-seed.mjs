import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const expectedQuestionCount = 143;
const csvPath = process.argv[2] ? resolve(process.argv[2]) : resolve('data/non-verbal-answers.csv');
const outputPath = resolve('supabase/seed/non_verbal_questions.sql');

function parseCsvField(field) {
  const trimmed = field.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed;
  return trimmed.slice(1, -1).replaceAll('""', '"');
}

const csv = (await readFile(csvPath, 'utf8')).replace(/^\uFEFF/, '');
const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
const header = lines.shift()?.split(',').map(parseCsvField);

if (!header || header.length !== 2 || header[0].toLowerCase() !== 'question' || header[1].toLowerCase() !== 'answer') {
  throw new Error('Expected CSV header: question,answer');
}

const seenIds = new Set();
const rows = lines.map((line, index) => {
  const columns = line.split(',').map(parseCsvField);
  if (columns.length !== 2) throw new Error(`CSV line ${index + 2} must contain exactly two columns.`);
  const [questionId, answer] = columns;
  if (!/^T\d+-\d+$/.test(questionId)) throw new Error(`Invalid question ID on line ${index + 2}: ${questionId}`);
  if (!/^[A-E]$/.test(answer)) throw new Error(`Invalid answer on line ${index + 2}: ${answer}`);
  if (seenIds.has(questionId)) throw new Error(`Duplicate question ID: ${questionId}`);
  seenIds.add(questionId);

  return { questionId, answer };
});

if (rows.length !== expectedQuestionCount) {
  throw new Error(`Expected ${expectedQuestionCount} data rows, found ${rows.length}.`);
}

for (const { questionId } of rows) {
  const imagePath = resolve('public', 'NVR', `${questionId}.png`);
  try {
    await access(imagePath);
  } catch {
    throw new Error(`Missing matching image: public/NVR/${questionId}.png`);
  }
}

const values = rows
  .map(({ questionId, answer }) => `  ('${questionId}', '${answer}')`)
  .join(',\n');
const sql = `-- Generated from ${basename(csvPath)}. Review before running in Supabase SQL Editor.\ninsert into public.non_verbal_questions (question_id, correct_answer)\nvalues\n${values}\non conflict (question_id) do update\nset correct_answer = excluded.correct_answer;\n`;

await mkdir(resolve('supabase/seed'), { recursive: true });
await writeFile(outputPath, sql, 'utf8');
console.log(`Wrote ${rows.length} question inserts to ${outputPath}`);