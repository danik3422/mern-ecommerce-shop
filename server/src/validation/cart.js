import { z } from 'zod'
import { lineItems } from './common.js'

export const replaceCartBody = z.strictObject({ items: lineItems })
