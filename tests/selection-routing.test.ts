import { PrismaClient } from "@prisma/client"
import SelectionRoutingService from "~/services/selection-routing"

let service: SelectionRoutingService
let db: PrismaClient

beforeAll(() => {
  db = new PrismaClient()
  service = new SelectionRoutingService(db)
})

test(`Test routing service`, async () => {
  const draw = await service.getDraw(1)
  expect(draw).toBeDefined()
  expect(draw.length === 6)
}, 60_000)