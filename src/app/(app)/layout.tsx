"use client";

import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader } from "lucide-react";
import { JobStatusProvider } from "@/infrastructure/jobs/JobStatusProvider";
import { JobStatusNotifier } from "@/components/ui/JobStatusNotifier";
import { DemoStatusProvider } from "@/infrastructure/demo/DemoContext";
import { useApiKeyStatus } from "@/hooks/useApiKeyStatus";
import { ApiKeySetupModal } from "@/components/ui/api-key-setup-modal";

const NavLink = ({ href, children }: { href: string; children: ReactNode; }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const finalHref = isDemo ? `${href}?demo=true` : href;
  const isActive = pathname === href;

  return (
    <Link href={finalHref} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-background text-foreground' : 'text-secondary-foreground hover:bg-secondary'}`}>
      {children}
    </Link>
  );
};

export default function PrivateLayout({ children }: { children: ReactNode; }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const { needsApiKey, loading: apiKeyLoading, refreshStatus } = useApiKeyStatus();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const isMainLayoutPage = ['/dashboard', '/profile'].includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isDemo) {
      router.replace("/");
    }
  }, [user, loading, isDemo, router]);

  // Show API key modal when needed
  useEffect(() => {
    if (!loading && !apiKeyLoading && needsApiKey && !showApiKeyModal) {
      setShowApiKeyModal(true);
    }
  }, [loading, apiKeyLoading, needsApiKey, showApiKeyModal]);

  const handleApiKeyModalClose = (success: boolean) => {
    setShowApiKeyModal(false);
    if (success) {
      refreshStatus();
    }
    // No need to handle failure since user cannot cancel the modal
  };

  const dashboardHref = isDemo ? "/dashboard?demo=true" : "/dashboard";
  const profileHref = isDemo ? "/profile?demo=true" : "/profile";

  if (loading || apiKeyLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  // Block access if user needs API key and modal is not shown yet
  if (needsApiKey && !showApiKeyModal) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user && !isDemo) { 
    return null; 
  }

  return (
    <DemoStatusProvider isDemo={isDemo}>
      <JobStatusProvider>
        <div className="min-h-screen bg-background">
          {isMainLayoutPage ? (
            <>
              <header className="bg-card/80 backdrop-blur-lg sticky top-0 z-20 border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <Link href={dashboardHref} className="flex items-center gap-3 text-xl font-bold text-foreground hover:text-primary transition-colors">
                      <Image src="/l_uco.svg" alt="UCO Logo" width={36} height={36} className="h-9" />
                      <span>TFG Adrián Reina Gálvez</span>
                    </Link>
                    <div className="flex items-center gap-6">
                      <nav className="hidden sm:flex items-center gap-2">
                        <NavLink href="/dashboard">Mis Exámenes</NavLink>
                        <NavLink href="/profile">Mi Perfil</NavLink>
                      </nav>
                      <Link href={profileHref}>
                        {user?.photoURL ? (
                          <Image src={user.photoURL} alt="User avatar" width={36} height={36} className="rounded-full cursor-pointer" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center cursor-pointer">
                            <span className="text-sm font-bold">{user?.displayName?.charAt(0)}</span>
                          </div>
                        )}
                      </Link>
                    </div>
                  </div>
                </div>
              </header>
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
            </>
          ) : (
            <>
              {children}
            </>
          )}
          <JobStatusNotifier />
          <ApiKeySetupModal 
            isOpen={showApiKeyModal}
            onClose={handleApiKeyModalClose}
          />
        </div>
      </JobStatusProvider>
    </DemoStatusProvider>
  );
}