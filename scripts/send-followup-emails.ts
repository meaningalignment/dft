import { db } from "../app/config.server"
import "dotenv/config"
import Mailgun from "mailgun.js"
import formData from "form-data"

;(async () => {
  const emailTemplate = `Hello,

Thank you for your valuable participation in our Democratic Fine-Tuning experiment earlier this year. Your contributions were greatly appreciated.

For those interested in the project's progress, we have published an early results report on our Substack. The outcomes so far are very promising!

https://meaningalignment.substack.com/p/the-first-moral-graph

We have one final request. As part of our process, we deduplicated cards in the background. To validate the accuracy of this deduplication, we would like your opinion on whether the value you provided is accurately reflected in the deduplicated card.

Please share your thoughts here: {URL}

Thank you for your continued support.


Best,

Joe & Oliver`

  const mg = new Mailgun(formData).client({
    username: "api",
    key: process.env.MAILGUN_API_KEY!,
    url: process.env.MAILGUN_URL!,
  })

  const users = await db.user.findMany({
    where: {
      email: {
        contains: "@"
      },
      chats: {
        some: {
          ValuesCard: {
            canonicalCardId: {
              not: null
            }
          }
        }
      },
    },
    include: {
      chats: {
        include: {
          ValuesCard: {
            include: {
              canonicalCard: true
            }
          }
        }
      }
    }
  }).then((l) => l.filter((u) => {
    return u.chats.filter((c) => {
      return (
        c.ValuesCard?.title && c.ValuesCard?.title !== c.ValuesCard.canonicalCard?.title
      )
    }).length > 0
  }))

  for (const user of users) {
    try {
      console.log(`Sending email to ${user.email}`)

      await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
        from: "Democratic Fine-Tuning <info@meaningalignment.org>",
        to: user.email,
        subject: "Democratic Fine-Tuning: Follow-up",
        text: emailTemplate.replace(
          "{URL}",
          `https://dft.meaningalignment.org/data/deduplications/${user.id}`
        ),
      })
    } catch (e) {
      console.log(`Error sending email to ${user.email}`)
      console.log(e)
    }
  }
})()
