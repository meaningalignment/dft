import { PrismaClient } from "@prisma/client"
import SelectionService from "~/services/selection"

let service: SelectionService
let db: PrismaClient

beforeAll(() => {
  db = new PrismaClient()
  service = new SelectionService(db)
})

test(`Test routing service`, async () => {
  const draw = await service.getDraw(1)
  expect(draw).toBeDefined()
  expect(draw.length).toBeGreaterThan(3)
}, 60_000)
