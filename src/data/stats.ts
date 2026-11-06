import models from './models.json';
import awards from './awards.json';
import profile from './profile.json';
import type { Lang } from '../i18n';

export const hfModels = models.filter((m) => m.type === 'model');
export const hfDatasets = models.filter((m) => m.type === 'dataset');
export const hfDownloads = models.reduce((sum, m) => sum + (m.downloads || 0), 0);
export const hfLikes = models.reduce((sum, m) => sum + (m.likes || 0), 0);
export const awardCount = awards.length;
export const githubRepos = profile.stats.githubRepos;

/** "2024-05" → months elapsed until the build date. */
export function monthsSince(start: string, now = new Date()): number {
  const [y, m] = start.split('-').map(Number);
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

export function formatTenure(start: string, lang: Lang): string {
  const total = monthsSince(start);
  const years = Math.floor(total / 12);
  const months = total % 12;
  if (lang === 'zh') {
    return [years && `${years} 年`, months && `${months} 個月`].filter(Boolean).join(' ');
  }
  const y = years ? `${years} yr${years > 1 ? 's' : ''}` : '';
  const mo = months ? `${months} mo${months > 1 ? 's' : ''}` : '';
  return [y, mo].filter(Boolean).join(' ');
}

/** "2025-09" / "2025/07" → "2025.09" */
export function dot(date: string): string {
  return date.replace(/[-/]/g, '.');
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
