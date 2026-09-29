import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-09-29" → "2026-09-29(화)" — 목록에서 날짜만 보고 요일을 가늠하기 어렵다는 요청으로 */
export function formatDateWithDow(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return `${date}(${DOW[d.getDay()]})`;
}
