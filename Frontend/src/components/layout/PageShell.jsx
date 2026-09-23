/**
 * Page chrome for ERP module pages: premium header with eyebrow, title,
 * description and actions. The app background, sidebar and navigation are
 * provided by AppLayout, so this only owns the page's own spacing.
 */
const PageShell = ({ eyebrow, title, description, icon: Icon, actions, children }) => (
  <div className="relative w-full px-3 py-4 sm:px-5 sm:py-6 md:px-7 lg:px-8 xl:px-10 2xl:px-14">
    <header className="mb-6 flex flex-col gap-5 border-b border-white/[0.06] pb-6 sm:mb-7 sm:pb-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300 shadow-lg shadow-cyan-500/5">
              <Icon size={20} />
            </div>
          ) : null}

          <div className="min-w-0">
            {eyebrow ? (
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400 sm:text-[11px] sm:tracking-[0.25em]">
                {eyebrow}
              </p>
            ) : null}

            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
              {title}
            </h1>
          </div>
        </div>

        {description ? (
          <p className="mt-3 max-w-3xl text-xs leading-6 text-gray-500 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          {actions}
        </div>
      ) : null}
    </header>

    {children}
  </div>
);

export default PageShell;
