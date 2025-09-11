"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Loader, TrendingUp, TrendingDown, Minus, BarChart3, Eye } from "lucide-react";
import { useApi } from "@/infrastructure/api/ApiProvider";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  ReferenceLine
} from 'recharts';

interface QuestionStats {
    questionIndex: number;
    maxPoints: number;
    professorMean: number;
    aiMean: number;
    correlation: number;
    agreement: number;
}

interface GradingDistribution {
    range: string;
    professorCount: number;
    aiCount: number;
}

interface PerformanceInsights {
    overall: {
        message: string;
        type: "excellent" | "good" | "acceptable" | "poor";
    };
    trend: {
        message: string;
        type: "ai_higher" | "professor_higher" | "balanced";
    };
    consistency: {
        message: string;
        type: "very_consistent" | "consistent" | "moderate" | "inconsistent";
    };
}

interface ScatterDataPoint {
    professor: number;
    ai: number;
    name: string;
}

interface ComparisonStatsData {
    professorMean: number;
    aiMean: number;
    professorStdDev: number;
    aiStdDev: number;
    correlation: number;
    discrepancies: {
        submissionId: string;
        respondentName: string | null;
        professorPoints: number;
        aiPoints: number;
        diff: number;
    }[];
    questionStats: QuestionStats[];
    gradingDistribution: GradingDistribution[];
    insights: PerformanceInsights;
    totalSubmissions: number;
    scatterData: ScatterDataPoint[];
}

function InsightsBadge({ insight }: { insight: { type: string; message: string } }) {
    const getColor = (type: string) => {
        switch (type) {
            case 'excellent': case 'very_consistent': return 'bg-green-100 text-green-800';
            case 'good': case 'consistent': case 'balanced': return 'bg-blue-100 text-blue-800';
            case 'acceptable': case 'moderate': return 'bg-yellow-100 text-yellow-800';
            case 'poor': case 'inconsistent': return 'bg-red-100 text-red-800';
            case 'ai_higher': return 'bg-purple-100 text-purple-800';
            case 'professor_higher': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ai_higher': return <TrendingUp className="h-4 w-4" />;
            case 'professor_higher': return <TrendingDown className="h-4 w-4" />;
            case 'balanced': return <Minus className="h-4 w-4" />;
            default: return <BarChart3 className="h-4 w-4" />;
        }
    };

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${getColor(insight.type)}`}>
            {getIcon(insight.type)}
            {insight.message}
        </div>
    );
}

function ComparisonStats({ stats }: { stats: ComparisonStatsData }) {
    const formatNumber = (num: number) => num.toFixed(2);
    const correlationColor = stats.correlation > 0.8 ? 'text-green-600' : stats.correlation > 0.5 ? 'text-yellow-600' : 'text-red-600';
    const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

    return (
        <div className="space-y-8">
            {/* Insights Cards */}
            <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Análisis Automático
                    </CardTitle>
                    <CardDescription>Conclusiones basadas en {stats.totalSubmissions} entregas comparables</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <InsightsBadge insight={stats.insights.overall} />
                        <InsightsBadge insight={stats.insights.trend} />
                        <InsightsBadge insight={stats.insights.consistency} />
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Nota Media (Manual)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold">{formatNumber(stats.professorMean)}</p>
                            <p className="text-sm text-muted-foreground">±{formatNumber(stats.professorStdDev)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Nota Media (IA)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold">{formatNumber(stats.aiMean)}</p>
                            <p className="text-sm text-muted-foreground">±{formatNumber(stats.aiStdDev)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Correlación</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <p className={`text-2xl font-bold ${correlationColor}`}>{formatNumber(stats.correlation)}</p>
                            <Badge variant={stats.correlation > 0.8 ? "default" : stats.correlation > 0.5 ? "secondary" : "destructive"}>
                                {stats.correlation > 0.8 ? "Excelente" : stats.correlation > 0.5 ? "Buena" : "Baja"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Diferencia Media</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatNumber(Math.abs(stats.professorMean - stats.aiMean))}</p>
                        <p className="text-sm text-muted-foreground">
                            {((Math.abs(stats.professorMean - stats.aiMean) / Math.max(stats.professorMean, stats.aiMean)) * 100).toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Scatter Plot - Correlation Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle>Correlación de Calificaciones</CardTitle>
                    <CardDescription>Comparación punto por punto entre calificaciones manuales y automáticas</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart data={stats.scatterData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                                type="number" 
                                dataKey="professor" 
                                name="Manual" 
                                label={{ value: 'Calificación Manual', position: 'insideBottom', offset: -10 }}
                            />
                            <YAxis 
                                type="number" 
                                dataKey="ai" 
                                name="IA" 
                                label={{ value: 'Calificación IA', angle: -90, position: 'insideLeft' }}
                            />
                            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                            <ReferenceLine x={0} stroke="#666" strokeDasharray="2 2" />
                            <ReferenceLine y={stats.professorMean} stroke="#3b82f6" strokeDasharray="5 5" />
                            <ReferenceLine x={stats.aiMean} stroke="#ef4444" strokeDasharray="5 5" />
                            <Tooltip 
                                formatter={(value, name) => [value, name === 'ai' ? 'IA' : 'Manual']}
                                labelFormatter={(value, payload) => {
                                    if (payload?.[0]?.payload?.name) {
                                        return `Estudiante: ${payload[0].payload.name}`;
                                    }
                                    return '';
                                }}
                            />
                            <Scatter 
                                name="Calificaciones" 
                                data={stats.scatterData} 
                                fill="#3b82f6" 
                                opacity={0.7}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Distribución de Calificaciones</CardTitle>
                        <CardDescription>Comparación por rangos de notas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.gradingDistribution}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="range" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="professorCount" name="Manual" fill="#3b82f6" />
                                <Bar dataKey="aiCount" name="IA" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {stats.questionStats.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Rendimiento por Pregunta</CardTitle>
                            <CardDescription>Correlación y acuerdo por cada pregunta</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats.questionStats.map((q, i) => ({ ...q, questionNumber: i + 1 }))}>
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis dataKey="questionNumber" label={{ value: 'Pregunta', position: 'insideBottom', offset: -10 }} />
                                    <YAxis domain={[0, 1]} />
                                    <Tooltip 
                                        formatter={(value, name) => [
                                            typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value,
                                            name === 'correlation' ? 'Correlación' : 'Acuerdo'
                                        ]}
                                        labelFormatter={(value) => `Pregunta ${value}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="correlation" name="Correlación" fill="#10b981" />
                                    <Bar dataKey="agreement" name="Acuerdo" fill="#f59e0b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Discrepancies Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Mayores Discrepancias</CardTitle>
                    <CardDescription>Entregas con mayor diferencia entre calificación manual y automática</CardDescription>
                </CardHeader>
                <CardContent>
                {stats.discrepancies.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead className="text-right">Nota Manual</TableHead>
                                <TableHead className="text-right">Nota IA</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                                <TableHead className="text-right">% Diferencia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {stats.discrepancies.map(d => (
                            <TableRow key={d.submissionId}>
                                <TableCell className="font-medium">{d.respondentName || 'Anónimo'}</TableCell>
                                <TableCell className="text-right font-medium">{d.professorPoints.toFixed(1)}</TableCell>
                                <TableCell className="text-right font-medium">{d.aiPoints.toFixed(1)}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={d.diff > 2 ? "destructive" : "secondary"}>
                                        Δ {d.diff.toFixed(1)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {((d.diff / Math.max(d.professorPoints, d.aiPoints)) * 100).toFixed(1)}%
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">No se encontraron discrepancias significativas.</p>
                        <p className="text-sm text-muted-foreground mt-2">¡Excelente correlación entre ambos métodos!</p>
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
    );
}

function ComparisonPageContent() {
    const params = useParams();
    const apiFetch = useApi();
    const examId = params.id as string;
    const searchParams = useSearchParams();
    const isDemo = searchParams.get('demo') === 'true';
    const backHref = isDemo ? `/exams/${examId}?demo=true` : `/exams/${examId}`;

    const [stats, setStats] = useState<ComparisonStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            if (!examId) return;
            setLoading(true);
            try {
                const response = await apiFetch("/calculateComparisonStats", {
                    method: 'POST',
                    body: JSON.stringify({ examId })
                });
                if (response.stats) {
                    setStats(response.stats);
                } else {
                    setError(response.message || "No hay datos suficientes para comparar.");
                }
            } catch (err) {
                setError("Error al calcular las estadísticas.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [examId, apiFetch]);
    
    return (
        <div className="space-y-6 animate-fade-in">
             <div>
                <Link href={backHref} className="flex items-center gap-2 text-sm text-primary hover:underline mb-2">
                    <ArrowLeft className="h-4 w-4" />
                    Volver al Examen
                </Link>
                <h1 className="text-3xl font-bold">Análisis de Comparación</h1>
            </div>

            {loading && (
                 <Card className="text-center py-20">
                    <CardContent className="flex flex-col items-center">
                        <Loader className="h-12 w-12 animate-spin mx-auto" />
                        <h2 className="mt-4 text-xl font-semibold">Calculando...</h2>
                        <p className="text-muted-foreground">Analizando las correcciones existentes.</p>
                    </CardContent>
                </Card>
            )}

            {error && <Card className="border-destructive"><p className="text-destructive p-4 text-center">{error}</p></Card>}

            {!loading && stats && <ComparisonStats stats={stats} />}
        </div>
    );
}

export default function ComparisonPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader className="h-10 w-10 animate-spin" /></div>}>
            <ComparisonPageContent />
        </Suspense>
    );
}