"use client";

import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { loginWithGoogle } from "@/infrastructure/auth/actions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader, Wand2 } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-[60%_40%] bg-background">
      <div className="hidden lg:flex flex-col items-center justify-center bg-surface relative overflow-hidden">
        <motion.div
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full"
        >
          <Image 
            src="/fondo.png"
            alt="Background"
            fill
            className="object-cover z-0"
            priority
          />
        </motion.div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12">
        <motion.div 
          className="text-center lg:text-left max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter">
            Exam Grader
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Evalúa exámenes de desarrollo en una fracción del tiempo. Deja que la IA te ayude.
          </p>
          <div className="mt-8 flex flex-col gap-4">
            <Button
              onClick={loginWithGoogle}
              size="lg"
              className="w-full"
            >
              <Image src="/logo_google.svg" alt="Google Logo" width={22} height={22} className="mr-2" />
              Continuar con Google
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/dashboard?demo=true">
                <Wand2 className="mr-2 h-4 w-4" />
                Entrar en Modo Demo
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}