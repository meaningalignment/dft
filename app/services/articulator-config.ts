import { ChatCompletionFunctions } from 'openai-edge';
import crypto from 'crypto'
import { default as defaultConfig } from '~/articulator-configs/default'

export interface ArticulatorConfig {
  name: string;
  model: string;
  prompts: {
    [key: string]: {
      prompt: string
      functions: ChatCompletionFunctions[]
    }
  }
  summarizers: {
    [key: string]: string
  }
}

interface ArticulatorMetadata {
  contentHash: string
  gitHash: string
  name: string
  model: string
}

export const configs: { [key: string]: ArticulatorConfig } = {
  "default": defaultConfig
}

export function summarize(config: ArticulatorConfig, function_name: string, result: Record<string, string>): string {
  const summarizer = config.summarizers[function_name]
  if (!summarizer) throw new Error(`No summarizer for function ${function_name}`)
  return summarizer.replace(/{{(\w+)}}/g, (_, key) => result[key])
}

export function metadata(config: ArticulatorConfig): ArticulatorMetadata {
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify(config))
  return {
    contentHash: hash.digest('hex'),
    gitHash: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
    name: config.name,
    model: config.model
  }
}
