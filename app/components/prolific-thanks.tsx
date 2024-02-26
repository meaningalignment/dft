type Props = {
  completionCode: string
}

export default function Thanks(props: Props) {
  const { completionCode } = props

  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="grid my-auto place-items-center py-12">
        <div className="flex flex-col items-center mx-auto max-w-xl text-center px-8">
          <h1 className="text-4xl font-bold mb-8">🙏 Thank You!</h1>
          <p>
            Your participation is greatly appreciated.
          </p>
        </div>

        <div className="my-8 p-8 border-2 border-border rounded-xl">
          <h1 className="text-2xl my-8">
            Your prolific completion code is <strong>{completionCode}</strong>
          </h1>
        </div>
      </div>
    </div>
  )
}