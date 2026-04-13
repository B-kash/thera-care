import { ThemeSwitcher } from "@/components/theme-switcher";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 sm:right-6 sm:top-6">
        <ThemeSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
