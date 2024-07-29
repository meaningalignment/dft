export function EmptyScreen(
  {title, description}: {title: string, description: string}
) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-white p-8">
        <h1 className="mb-2 text-lg font-semibold">{title ?? "Articulate a value"}</h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          {description ?? "Share a meaningful moment to get started."}
        </p>
      </div>
    </div>
  )
}
