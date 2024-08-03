> [!IMPORTANT]
> **This repository is archived.** We're working on turning this process into a standalone deliberation platform for any topic. You can see this fork [here](https://github.com/meaningalignment/mgd).


# Moral Graph Deliberation Tooling

*Developed by the [Meaning Alignment Institute](https://www.meaningalignment.org/), funded by [OpenAI](https://openai.com/blog/democratic-inputs-to-ai). Live deployment available at [dft.meaningalignment.org](https://dft.meaningalignment.org).*

## Table of Contents

- [Overview](#overview)
    - [Background](#background)
    - [Tech Stack](#tech-stack)
    - [Output](#output)
- [Setting Up a New Environment](#setting-up-a-new-environment)
- [Setting Up a New Deliberation](#setting-up-a-new-deliberation)
- [Contributing](#contributing)
    - [Local Setup](#local-setup)
    - [Database Evolution](#database-evolution)
- [Additional Documentation](#additional-documentation)

# Overview

Democratic Fine-Tuning (DFT) is an initiative aimed at achieving a fine-tuned model that bridges political, cultural, and ideological boundaries. More info can be found in our [paper](./paper.pdf). 

This repository hosts code for an application with a new democratic process that takes ~15 minutes to complete.

Participants go through the following steps:

1. **Dialogue**: Participants interact with a chatbot, discussing values they believe ChatGPT should have when responding to contentious questions.
2. **Vote on Values**: Participants vote on values proposed by their peers.
3. **Vote on Wisdom Transition**: Participants vote on wether the transition from one value to another represents an increase in wisdom.

This process generates a [moral graph](https://dft.meaningalignment.org/data/edges), which can be used to find convergence in which values ChatGPT should have in contentious scenarios, while remaining legible and democratically legitimated.

![Moral Graph](./graph.png)

The intricacies of the graph can be [explored here](https://dft.meaningalignment.org/data/edges).

## Background

Our aspiration with DFT is to craft a model universally regarded as "wise." Such a model would resonate with Republicans, Democrat, irrespective of their ideological or cultural bearings. The ultimate goal is to mitigate the prospects of ideological conflicts amplified by models individually fine-tuned based on group or individual preferences. Two novel techniques are employed:

- **Value Alignment**: Rather than aligning with preferences, the model is aligned with values. These values are sourced from an expansive and diverse demographic. For more on how we define values, [please read our paper](./paper.pdf).
- **Moral Graph Creation**: This graph helps find convergent values.

Subsequent endeavors will focus on fine-tuning the LLM based on these values.

## Tech Stack

- **Development Language**: TypeScript
- **Framework**: [Remix](https://remix.run)
- **Database**: PostgreSQL
- **Event Queue**: [Inngest](https://inngest.com)
- **Deployment Platform**: [Vercel](https://vercel.com)

## Output

The moral graph, survey data and demographics data we collected can be found [here](./data/).

- **Database Schema**: The data collated during the process adheres to our [database schema](./schema.prisma).
- **Moral Graph Generation**: The code responsible for generating the moral graph is available [here](./app/values-tools/generate-moral-graph.ts).
- **Data Export**: A moral graph can be exported in JSON format via [this endpoint](http://dft.meaningalignment.org/data/edges.json). The export schema is detailed [here](./app/values-tools/moral-graph-summary.ts).


# Setting Up a New Environment

To initialize a new environment, follow these steps:

## Initial Configuration

1. **Environment Variables**: Begin by duplicating the `.env.example` file to create a `.env` file.

## Setup Dependencies

Our application relies on several external services for various functionalities. You'll need to set up accounts and obtain API keys for the following services:

- **Mailgun (For Sending Login Emails)**:
  - Create an account on [Mailgun](https://www.mailgun.com/).
  - Obtain your API key from the Mailgun dashboard.
  - Add your Mailgun API key etc. to the `.env` file.

- **OpenAI (For OpenAI APIs)**:
  - Add your OpenAI API key to the `.env` file.

- **Inngest (Event Queue for Background Jobs)**:
  - Create an account on [Inngest](https://inngest.com/).
  - Follow the Inngest setup process to initialize your event queue.
  - No immediate `.env` configuration is required; Once your vercel project is configured, you can connect your inngest account to vercel by clicking "Connect to Vercel" from the Inngest dashboard.

## PostgreSQL Database Setup

We recommend using Vercel PostgreSQL for the database:

- **Vercel PostgreSQL**:
  - If you haven't already, sign up or log in to [Vercel](https://vercel.com/).
  - Navigate to the Integrations or Database section and create a new PostgreSQL database.
  - Once your database is created, Vercel will provide you with the necessary environment variables.
  - Copy these POSTGRES environment variables into your `.env` file.
  - Populate the database by running `npx prisma generate && npx prisma db push`.

## Deployment

- **Create a New Vercel Project**:
  - In your Vercel dashboard, create a new project by importing this repository.
  - During the import process, Vercel will automatically detect the project settings. Make sure to review them for accuracy.
  - Update the .env variables.

- **Link Inngest to Your Vercel Project**:
  - Log into your [Inngest](https://inngest.com/) account.
  - Navigate to the section where you can connect to Vercel and select the option to "Connect to Vercel".
  - Follow the prompts to authorize and link Inngest with your Vercel project. This action will automatically populate your Vercel project with the necessary environment variables for Inngest.

After completing these steps, your environment should be set up and ready.

# Setting Up a New Deliberation

Deliberations are conducted by creating a case. Here are the steps to set up a new deliberation:

1. **Make yourself an admin user**: This can be done by setting `isAdmin = true` for your user in the database.

2. **Creating a Case**: Deliberations are initiated by creating a case. This can be done by navigating to `/admin/cases` on your site. 

3. **Generating Seed Values and Upgrade Stories**: After a case is created, some seed values and upgrade stories are automatically generated in the background, assuming Inngest is set up correctly.

Once a case has been added, participants can begin the deliberation process by navigating to `/start` on the site. As values and upgrades are populated, the resulting moral graph can be viewed at `/data/edges`, providing insights into the convergence of values through the deliberation process.

# Contributing

## Local Setup

1. **Install Dependencies**: `npm i`
2. **Generate Prisma Schema**: `npx prisma generate`
3. **Environment Configuration**: Duplicate `.env.example` to create `.env` and populate it with relevant values.
4. **Run Development Server**: `npm run dev`

## Database Evolution

To update the database schema, execute: `npx prisma db push`. The schema can be found [here](./schema.prisma).


## Additional Documentation

- [Remix Documentation](https://remix.run/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

*Thank you for your engagement with Democratic Fine-Tuning. We value your contributions and insights.*
