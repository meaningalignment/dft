import { Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import React, { useEffect, useState } from "react"

type Props = {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null | undefined
  iconRight?: React.ReactNode,
  children: React.ReactNode,
  onClick?: () => void
  disabled?: boolean
}

export default function LoadingButton(props: Props) {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setTimeout(() => {
        setIsLoading(false)
      }, 10_000)
    }
  }, [isLoading])

  return (
    <Button
      variant={props.variant}
      onClick={() => {
        setIsLoading(true)
        if (props.onClick) props.onClick()
      }}
      disabled={isLoading || props.disabled}>
      {props.children}
      {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : props.iconRight}
    </Button>
  )
}


export function SubmitLoadingButton({ children, disabled, className }: { children: React.ReactNode, disabled: boolean, className?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setTimeout(() => {
        setIsLoading(false)
      }, 10_000)
    }
  }, [isLoading])

  return (
    <Button
      type="submit"
      onClick={() => {
        setIsLoading(true)
      }}
      className={className}
      disabled={isLoading || disabled}>
      {children}
      {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
    </Button>
  )
}