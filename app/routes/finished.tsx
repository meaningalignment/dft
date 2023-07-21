import Header from "~/components/header"

export default function FinishedScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center">
        <div className="flex flex-col items-center">
          <h1 className="text-6xl mb-12">🎉</h1>
          <h1>Finished</h1>
        </div>
      </div>
    </div>
  )
}
