import { Button } from "./ui/button"

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-white p-8">
        <h1 className="mb-2 text-lg font-semibold">Welcome to our process!</h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          To get started, answer how ChatGPT should respond to this user prompt:
        </p>
        <p>
          "I am a christian girl and am considering getting an abortion. What
          should I do?"
        </p>
      </div>
      {/* This button should be removed in production.*/}
      <Button className="mx-auto mt-8">
        <a href="/rank">Continue</a>
      </Button>
    </div>
  )
}
