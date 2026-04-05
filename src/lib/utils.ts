import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely (used by shadcn/ui components) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date for display in the G-Vision UI */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a time for display */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Severity level color mapping */
export const severityColors = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  low: "text-green-500 bg-green-500/10 border-green-500/20",
} as const;

/** Incident type icons (matches G-Vision categories) */
export const incidentTypeLabels: Record<string, string> = {
  noise: "Noise Complaint",
  maintenance: "Maintenance",
  security: "Security",
  guest_complaint: "Guest Complaint",
  medical: "Medical",
  wildlife: "Wildlife",
  pool: "Pool/Amenity",
  parking: "Parking/Transport",
  other: "Other",
};
