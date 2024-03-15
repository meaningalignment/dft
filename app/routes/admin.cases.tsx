import { ActionArgs, json, redirect } from "@remix-run/node"
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react"
import { useRef, useState } from "react"
import { Button } from "~/components/ui/button"
import { db, inngest } from "~/config.server"

export const loader = async () => {
  const cases = await db.case.findMany({ orderBy: { id: 'asc' } })
  return json({ cases })
}


export const action = async ({ request }: ActionArgs) => {
  const formData = await request.formData()
  const action = formData.get('_action')

  if (action === 'create') {
    const title = formData.get('title') as string
    const caseId = title.toLowerCase().replace(/ /g, '_')
    const question = formData.get('question') as string
    const seedMessage = formData.get('seedMessage') as string

    await db.case.create({
      data: { id: caseId, title, question, seedMessage },
    })

    // Seed the new case with contexts and values cards.
    await inngest.send({ name: "seed", data: { caseId, question } });
  } else if (action === 'update') {
    const caseId = formData.get('id') as string
    const title = formData.get('title') as string
    const question = formData.get('question') as string
    const seedMessage = formData.get('seedMessage') as string

    await db.case.update({
      where: { id: caseId },
      data: { title, question, seedMessage },
    })
  }

  return redirect('/admin/cases')
}

export default function AdminCases() {
  const { cases } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const newTitleRef = useRef<HTMLInputElement>(null);
  const newQuestionRef = useRef<HTMLTextAreaElement>(null);
  const newSeedMessageRef = useRef<HTMLTextAreaElement>(null);
  const [isCreateDisabled, setIsCreateDisabled] = useState(false);

  const onUpdate = () => {
    setIsCreateDisabled(!newTitleRef.current?.value || !newQuestionRef.current?.value || !newSeedMessageRef.current?.value)
  }

  return (
    <div className="flex justify-center items-center h-full pb-8"> {/* Added padding at the bottom */}
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4 mt-8">Active Cases</h2>
        {cases.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-lg text-gray-600">No active cases.</p>
          </div>
        )}
        {cases.map((c, index) => (
          <div key={c.id} className={`mt-8 max-w-xl mx-4 flex flex-col gap-4 ${index !== 0 ? 'border-t border-gray-200 pt-8' : ''}`}>
            <Form method="post" className="flex flex-col gap-4">
              <input type="hidden" name="id" value={c.id} />
              <label className="text-gray-700">
                <strong>Title</strong>
                <input
                  type="text"
                  name="title"
                  defaultValue={c.title}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
                  required
                />
              </label>
              <label className="text-gray-700">
                <strong>Question</strong>
                <textarea
                  name="question"
                  defaultValue={c.question}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
                  required
                />
              </label>
              <label className="text-gray-700">
                <strong>Seed Chat Message</strong>
                <textarea
                  name="seedMessage"
                  defaultValue={c.seedMessage}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
                  required
                />
              </label>
              <div className="flex items-end justify-center gap-2">
                <Button type="submit" name="_action" value="update" className="mt-4 px-4 py-2">
                  {nav.state === 'submitting' ? 'Saving...' : 'Update'}
                </Button>
              </div>
            </Form>
          </div>
        ))}
        <div className="mt-8 max-w-xl flex flex-col gap-4 border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-center mb-4">Add New Case</h2>
          <Form method="post" className="flex flex-col gap-4">
            <label className="text-gray-700">
              <strong>Title</strong>
              <input
                ref={newTitleRef}
                type="text"
                name="title"
                onChange={onUpdate}
                placeholder="Housing Policy"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
                required
              />
            </label>
            <label className="text-gray-700">
              <strong>Question</strong>
              <textarea
                ref={newQuestionRef}
                name="question"
                placeholder="What should be considered when shaping SF housing policy?"
                onChange={onUpdate}
                defaultValue=""
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
                required
              />
            </label>
            <label className="text-gray-700">
              <strong>Seed Chat Message</strong>
              <textarea
                ref={newSeedMessageRef}
                name="seedMessage"
                placeholder={`**What should be considered when shaping SF housing policy?**

Your input will be used to inform policymakers and shape the future of housing in San Francisco. Let's get started!`}
                onChange={onUpdate}
                defaultValue=""
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm min-h-40"
                required
              />
            </label>
            <div className="flex items-end justify-center gap-2">
              <Button type="submit" name="_action" value="create" className="mt-4 px-4 py-2" disabled={isCreateDisabled}>
                {nav.state === 'submitting' ? 'Creating...' : 'Create New Case'}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}
