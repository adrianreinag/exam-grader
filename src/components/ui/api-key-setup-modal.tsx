"use client";

import { useState } from "react";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { updateUserSettings } from "@/infrastructure/api/user-settings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// DialogContent without close button for required modals
const DialogContentNoClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-md",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContentNoClose.displayName = "DialogContentNoClose";

interface ApiKeySetupModalProps {
  isOpen: boolean;
  onClose: (success: boolean) => void;
}

export function ApiKeySetupModal({ isOpen, onClose }: ApiKeySetupModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Por favor ingresa una clave API válida");
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      toast.error("La clave API debe comenzar con 'sk-'");
      return;
    }

    setLoading(true);
    try {
      await updateUserSettings({ openaiApiKey: apiKey });
      toast.success("Clave API configurada correctamente");
      onClose(true);
    } catch (err) {
      console.error('Error saving API key:', err);
      toast.error("Error al guardar la clave API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContentNoClose 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configurar Clave API de OpenAI
          </DialogTitle>
          <DialogDescription>
            Para usar el sistema de calificación con IA, necesitas proporcionar tu propia clave API de OpenAI.
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Esta aplicación requiere tu propia clave API de OpenAI para funcionar. 
            Tu clave se almacena de forma segura y solo tú tienes acceso a ella.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Clave API de OpenAI</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={loading}
              className="font-mono"
            />
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>¿No tienes una clave API? </p>
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
            >
              Obtén tu clave API aquí
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave}
            disabled={loading || !apiKey.trim()}
            className="flex items-center gap-2 w-full"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Key className="h-4 w-4" />
            )}
            Configurar Clave API
          </Button>
        </div>
      </DialogContentNoClose>
    </Dialog>
  );
}