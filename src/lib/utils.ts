import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAbsolutePosition(parentId: string, xPercent: number, yPercent: number) {
    if (typeof window === 'undefined') {
        return { x: 0, y: 0 };
    }
    const parent = document.getElementById(parentId);
    if (!parent) {
        return { x: 0, y: 0 };
    }
    const rect = parent.getBoundingClientRect();
    const x = rect.left + (rect.width * xPercent / 100);
    const y = rect.top + (rect.height * yPercent / 100);
    return { x, y };
}
