type PageTitleProps = {
  children: string
}

export function PageTitle({ children }: PageTitleProps) {
  return (
    <h1 className="mb-6 text-[32px] font-semibold tracking-[-0.025em]">
      {children}
    </h1>
  )
}
