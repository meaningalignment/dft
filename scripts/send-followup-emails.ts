import { db } from "../app/config.server"

import "dotenv/config"

import Mailgun from "mailgun-js"

;(async () => {
  const emailTemplate = `Hello,

Thank you for your valuable participation in our [Democratic Fine-Tuning](https://meaningalignment.substack.com/p/introducing-democratic-fine-tuning) experiment earlier this year. Your contributions were greatly appreciated.

For those interested in the project's progress, we have published an [early results report on our Substack](https://meaningalignment.substack.com/p/the-first-moral-graph). The outcomes so far are very promising!

We have one final request. As part of our process, we deduplicated cards in the background. To validate the accuracy of this deduplication, we would like your opinion on whether the value you provided is accurately reflected in the deduplicated card.

Please share your thoughts here: {URL}

Thank you for your continued support.

Best,

Oliver & Joe`

  const mg = Mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  })

  const users = await db.user.findMany({
    where: {
      OR: [
        // {
        //   email: "joeedelman@gmail.com",
        // },
        {
          email: "oliverklingefjord@gmail.com",
        },
      ],
    },
  })

  for (const user of users) {
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: "Democratic Fine-Tuning <info@meaningalignment.org>",
      to: user.email,
      subject: "Democratic Fine-Tuning: Follow-up",
      text: emailTemplate.replace(
        "{URL}",
        `https://dft.meaningalignment.org/data/deduplications/${user.id}`
      ),
    })
  }
})()
