"use client";

import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { useApi } from "@/infrastructure/api/ApiProvider";
import { logout } from "@/infrastructure/auth/actions";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StateIndicator } from "@/components/ui/state-indicator";
import { Loader, User, LogOut, Settings, Key, Save } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { translateStatus } from "@/utils/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserSettings, updateUserSettings, UserSettings } from "@/infrastructure/api/user-settings";

type RespondedExam = { id: string; title: string; state: "UNGRADED" | "GRADED_DRAFT" | "GRADED_FINAL"; submittedAt: string; totalPoints: number | null; submissionId: string; };

export default function ProfilePage() {
  const { user } = useAuth();
  const apiFetch = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [respondedExams, setRespondedExams] = useState<RespondedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [savingApiKey, setSavingApiKey] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [respondedRes, settingsRes] = await Promise.all([
          apiFetch("/listRespondedExams"),
          isDemo ? null : getUserSettings()
        ]);
        setRespondedExams(respondedRes.exams);
        if (settingsRes) {
          setUserSettings(settingsRes);
        }
      } catch (err) { 
        toast.error("No se pudieron cargar tus datos."); 
      } finally { 
        setLoading(false); 
        setSettingsLoading(false);
      }
    };
    if (user) fetchData();
  }, [user, apiFetch, isDemo]);

  const handleSaveApiKey = async () => {
    if (isDemo) return;
    
    setSavingApiKey(true);
    try {
      const updatedSettings = await updateUserSettings({ openaiApiKey });
      setUserSettings(updatedSettings);
      setOpenaiApiKey('');
      toast.success("Clave API actualizada correctamente");
    } catch (err) {
      toast.error("Error al actualizar la clave API");
    } finally {
      setSavingApiKey(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {user?.photoURL ? (
            <Image src={user.photoURL} alt="Avatar" width={80} height={80} className="rounded-full border-2" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center border-2">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{user?.displayName}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={isDemo ? () => router.push('/') : logout}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isDemo ? 'Salir del Modo Demo' : 'Cerrar Sesión'}
        </Button>
      </div>

      {!isDemo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="flex justify-center p-4">
                <Loader className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4" />
                    <span>Clave API de OpenAI</span>
                    {userSettings?.hasOpenaiApiKey ? (
                      <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded">
                        Configurada
                      </span>
                    ) : (
                      <span className="text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded">
                        No configurada (usando clave del sistema)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configura tu propia clave de OpenAI para usar el sistema de calificación con IA. 
                    Si no la configuras, se usará la clave del sistema.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openai-key">Nueva Clave API</Label>
                  <div className="flex gap-2">
                    <Input
                      id="openai-key"
                      type="password"
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSaveApiKey}
                      disabled={!openaiApiKey.trim() || savingApiKey}
                      className="flex items-center gap-2"
                    >
                      {savingApiKey ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
            <CardTitle>Exámenes Respondidos</CardTitle>
        </CardHeader>
        <CardContent>
            {loading && <div className="p-12 flex justify-center"><Loader className="h-8 w-8 animate-spin" /></div>}
            {!loading && (
                respondedExams.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Examen</TableHead>
                                <TableHead>Fecha de Entrega</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Nota Final</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {respondedExams.map((exam) => (
                                <TableRow key={exam.submissionId}>
                                    <TableCell className="font-medium">{exam.title}</TableCell>
                                    <TableCell>{new Date(exam.submittedAt).toLocaleDateString('es-ES')}</TableCell>
                                    <TableCell>
                                        <StateIndicator state={exam.state}>
                                            {translateStatus(exam.state)}
                                        </StateIndicator>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg text-primary">
                                        {exam.totalPoints !== null ? `${exam.totalPoints} pts` : 'Pendiente'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="p-12 text-center text-muted-foreground italic">Aún no has respondido a ningún examen.</p>
                )
            )}
        </CardContent>
      </Card>
    </div>
  );
}