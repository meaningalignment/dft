import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1)
}

export function isFirstWordUppercase(str: string) {
  return (
    str.split(" ").slice(0, 1)[0] ===
    str.split(" ").slice(0, 1)[0].toUpperCase()
  )
}

export function embeddingFromSql(value: any): number[] {
  return value
    .substring(1, value.length - 1)
    .split(",")
    .map((v: any) => parseFloat(v))
}

export function embeddingToSql(embedding: number[]): string {
  return JSON.stringify(embedding)
}
