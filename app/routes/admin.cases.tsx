import { ActionFunctionArgs, json, redirect } from "@remix-run/node"
import { Form, useActionData, useLoaderData } from "@remix-run/react"
import { db } from "~/config.server"

export const loader = async () => {
  const cases = await db.case.findMany()
  return json({ cases })
}


export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const action = formData.get('_action')

  if (action === 'create') {
    const title = formData.get('title') as string
    const id = title.toLowerCase().replace(/ /g, '_')
    const question = formData.get('question') as string
    const seedMessage = formData.get('seedMessage') as string

    await db.case.create({
      data: { id, title, question, seedMessage },
    })
  } else if (action === 'update') {
    const id = formData.get('id') as string
    const title = formData.get('title') as string
    const question = formData.get('question') as string
    const seedMessage = formData.get('seedMessage') as string

    await db.case.update({
      where: { id },
      data: { title, question, seedMessage },
    })
  }

  return redirect('/admin/cases')
}


function AdminCases() {
  const { cases } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div>
      <h1>Cases Admin Panel</h1>
      <Form method="post">
        <label>
          Title:
          <input type="text" name="title" placeholder="Abortion" required />
        </label>
        <label>
          Question:
          <input type="text" name="question" placeholder="What should the abortion policies be in the US?" required />
        </label>
        <label>
          Seed Chat Message:
          <input type="text" name="seedMessage" placeholder="Your task is to figure out what the abortion policies should be in the US. Please tell us what you think is important to take into consideration when forming these policies!" required />
        </label>
        <button type="submit" name="_action" value="create">Create Case</button>
      </Form>
      <ul>
        {cases.map((c) => (
          <li key={c.id}>
            {c.title} - {c.question}
            <Form method="post">
              <input type="hidden" name="id" value={c.id} />
              <label>
                Title:
                <input type="text" name="title" value={c.title} required />
              </label>
              <label>
                Question:
                <input type="text" name="question" value={c.question} required />
              </label>
              <label>
                Seed Chat Message:
                <input type="text" name="seedMessage" value={c.seedMessage} required />
              </label>
              <button type="submit" name="_action" value="update">Edit</button>
            </Form>
          </li>
        ))}
      </ul>
    </div>
  )
}

