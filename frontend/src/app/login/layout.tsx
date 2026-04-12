import { ThemeSwitcher } from "@/components/theme-switcher";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ThemeSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
