export default function Button(props: { children: React.ReactNode }) {
  return (
    <button
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded rounded-md"
      {...props}
    />
  )
}
