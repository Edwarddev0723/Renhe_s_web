import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Drop a `public/resume.pdf` in and every resume button appears on the next build. */
export const hasResume = existsSync(join(process.cwd(), 'public', 'resume.pdf'));
