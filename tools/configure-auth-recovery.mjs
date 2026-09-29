#!/usr/bin/env node
// Applies only the approved recovery redirect entries and Korean recovery email.
// Requires a thinkerbell-scoped SUPABASE_ACCESS_TOKEN in the local .env.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const root = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const ref = 'vzhyhadjtaqbapicjrco';
const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const redirects = [
  'https://thinkerbell-eight.vercel.app/?auth=recovery',
  'https://thinkerbell-*-jjackbb-projects.vercel.app/**',
];
const subject = '니편내편 비밀번호 재설정';
const templatePath = path.join(root, 'docs/email-templates/reset-password.ko.html');
const template = fs.readFileSync(templatePath, 'utf8').trim();
if (!template.includes('{{ .ConfirmationURL }}')) {
  throw new Error('Recovery template lacks the confirmation link placeholder');
}

if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({
    mode: 'plan-only', projectRef: ref, addRedirects: redirects,
    recoverySubject: subject, recoveryTemplateFile: path.relative(root, templatePath),
    existingRedirects: 'preserved',
  }, null, 2));
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN in this checkout .env; do not paste it into chat');
async function authConfig(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Supabase Auth Management API ${method} HTTP ${response.status}`);
  return response.json();
}

const current = await authConfig('GET');
if (typeof current.uri_allow_list !== 'string' ||
    typeof current.site_url !== 'string' ||
    current.site_url.replace(/\/$/, '') !== 'https://thinkerbell-eight.vercel.app') {
  throw new Error('Auth config/site URL mismatch; no settings changed');
}
const existing = current.uri_allow_list.split(',').map(value => value.trim()).filter(Boolean);
const merged = [...new Set([...existing, ...redirects])];
const patch = {
  uri_allow_list: merged.join(','),
  mailer_subjects_recovery: subject,
  mailer_templates_recovery_content: template,
};
if (current.uri_allow_list !== patch.uri_allow_list ||
    current.mailer_subjects_recovery !== patch.mailer_subjects_recovery ||
    current.mailer_templates_recovery_content?.trim() !== patch.mailer_templates_recovery_content) {
  await authConfig('PATCH', patch);
}
const confirmed = await authConfig('GET');
const confirmedEntries = typeof confirmed.uri_allow_list === 'string'
  ? confirmed.uri_allow_list.split(',').map(value => value.trim()).filter(Boolean) : [];
if (!redirects.every(value => confirmedEntries.includes(value)) ||
    !existing.every(value => confirmedEntries.includes(value)) ||
    confirmed.mailer_subjects_recovery !== subject ||
    confirmed.mailer_templates_recovery_content?.trim() !== template) {
  throw new Error('Auth config readback mismatch');
}
console.log(JSON.stringify({
  projectRef: ref,
  redirectsPresent: true,
  previousRedirectsPreserved: true,
  recoverySubjectAndBodyPresent: true,
  secretValuesPrinted: false,
}));
