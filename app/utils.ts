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

/**
 * Calculate the average embedding vector.
 * @param embeddings An array of embedding vectors.
 * @returns The average embedding vector.
 */
export function calculateAverageEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error("The embeddings array cannot be empty")
  }

  const dimension = embeddings[0].length

  // Ensure all vectors have the same dimension
  for (let emb of embeddings) {
    if (emb.length !== dimension) {
      throw new Error("All embedding vectors should have the same dimension")
    }
  }

  let averageVector = Array(dimension).fill(0)

  // Sum up all embedding vectors
  for (let emb of embeddings) {
    for (let i = 0; i < dimension; i++) {
      averageVector[i] += emb[i]
    }
  }

  // Divide by the number of embedding vectors to get the average
  for (let i = 0; i < dimension; i++) {
    averageVector[i] /= embeddings.length
  }

  return averageVector
}
