import { json } from "@remix-run/node"

export async function loader(): Promise<Response> {
  await new Promise((resolve) => setTimeout(resolve, 20000))
  return json({ message: "Hello world!"})
}

export async function action(): Promise<Response> {
  await new Promise((resolve) => setTimeout(resolve, 20000))
  return json({ message: "Hello world!"})
}