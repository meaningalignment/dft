import React from "react"
import { cn } from "../utils"
import { Button, type ButtonProps } from "./ui/button"
import { IconArrowDown } from "./ui/icons"

function useAtBottom(offset = 0) {
  const [isAtBottom, setIsAtBottom] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setIsAtBottom(
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - offset
      )
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [offset])

  return isAtBottom
}

export function ButtonScrollToBottom({ className, ...props }: ButtonProps) {
  const isAtBottom = useAtBottom()

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute right-4 top-1 z-10 bg-white transition-opacity duration-300 sm:right-8 md:top-2",
        isAtBottom ? "opacity-0" : "opacity-100",
        className
      )}
      onClick={() =>
        window.scrollTo({
          top: document.body.offsetHeight,
          behavior: "smooth",
        })
      }
      {...props}
    >
      <IconArrowDown />
      <span className="sr-only">Scroll to bottom</span>
    </Button>
  )
}
