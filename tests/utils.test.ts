import { formatDate } from "../app/utils"

test("Formats date correctly", () => {
  expect(formatDate(new Date("2021-06-13T00:00:00.000Z"))).toBe("June 13, 2021")
})
