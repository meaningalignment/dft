import Header from "~/components/header"

export default function SelectScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="flex flex-grow place-items-center space-y-8 py-12 mx-3">
        <div className="flex flex-col place-items-center mx-auto">
          <img src="/cake.gif" className="mx-auto" />
        </div>
      </div>
    </div>
  )
}
