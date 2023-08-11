import { calculateAverageEmbedding } from "~/utils"

test("Test averaging over embedding vectors", () => {
  const embeddings = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
  ]

  const averageEmbedding = calculateAverageEmbedding(embeddings)
  expect(averageEmbedding).toEqual([3, 4, 5, 6])
})

test("Test averaging over embedding vectors fails if different dims", () => {
  const embeddings = [
    [1, 2, 3, 4],
    [5, 6, 7, 8, 9],
  ]
  const call = () => calculateAverageEmbedding(embeddings)
  expect(call).toThrowError()
})
