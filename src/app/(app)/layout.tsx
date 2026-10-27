import { AppProvider } from "@/components/AppProvider";
import { Shell } from "@/components/Shell";
import { ToastProvider } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppProvider>
        <Shell>{children}</Shell>
      </AppProvider>
    </ToastProvider>
  );
}
