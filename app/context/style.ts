import { createContext } from "react"
import { ValueStyle, dftStyle } from "~/values-tools/value-styles"

export const StyleContext = createContext<{
  valueStyle: ValueStyle
}>({ valueStyle: dftStyle })
