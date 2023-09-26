export const config = {
  maxDuration: 300,
}

export default async function loader() {
  // Sleep 61 secionds.
  await new Promise((resolve) => setTimeout(resolve, 61000))

  return { message: "Hello world!" }
}
