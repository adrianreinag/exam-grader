
"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { usePathname, useSearchParams } from "next/navigation";

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

export default function MainLayout({ children }: { children: ReactNode; }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const dashboardHref = isDemo ? "/dashboard?demo=true" : "/dashboard";
  const profileHref = isDemo ? "/profile?demo=true" : "/profile";

  return (
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
  );
}