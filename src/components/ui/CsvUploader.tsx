"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { apiFetch, ApiError } from '@/infrastructure/api/client';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface CsvUploaderProps {
  examId: string;
  onUploadSuccess: () => void;
}

type UploadState = 'idle' | 'parsing' | 'uploading' | 'success' | 'error';

export function CsvUploader({ examId, onUploadSuccess }: CsvUploaderProps) {
  const [, setStatus] = useState<UploadState>('idle');
  const [, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setStatus('parsing');
    setErrorMessage(null);

    const csvText = await file.text();
    (Papa as any).parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      newline: "",
      delimiter: ",",
      complete: async (results: Papa.ParseResult<Record<string, string>>) => {
        if (results.errors.length > 0) {
          setStatus('error');
          const msg = `Error al analizar el CSV: ${results.errors[0].message}`;
          setErrorMessage(msg);
          toast.error(msg);
          return;
        }

        if (!results.meta.fields?.includes('student_email')) {
          setStatus('error');
          const msg = "El archivo CSV debe contener una columna llamada 'student_email'.";
          setErrorMessage(msg);
          toast.error(msg);
          return;
        }
        
        setStatus('uploading');
        const toastId = toast.loading('Subiendo respuestas...');
        try {
          await apiFetch('/uploadSubmissionsCsv', {
            method: 'POST',
            body: JSON.stringify({
              examId: examId,
              payload: results.data,
            }),
          });
          setStatus('success');
          onUploadSuccess();
          toast.success('¡Subida programada!', { id: toastId, description: 'Recibirás un email con el resumen.' });
          setTimeout(() => setStatus('idle'), 5000);
        } catch (err) {
          setStatus('error');
          if (err instanceof ApiError && err.status === 400 && err.body?.error?.issues) {
            const issues = err.body.error.issues;
            
            // Buscar el primer error de validación en el array payload
            const payloadIssue = issues.find((issue: any) => 
              issue.path && issue.path.length >= 2 && issue.path[0] === 'payload'
            );

            if (payloadIssue) {
              const rowIndex = payloadIssue.path[1]; // índice de la fila en el array
              const fieldName = payloadIssue.path[2] || 'desconocido'; // nombre del campo
              const failingRowData = results.data[rowIndex] as any;
              const failingEmail = failingRowData?.student_email || '[email no encontrado]';
              
              setErrorMessage(`Fila ${rowIndex + 2} (email: ${failingEmail}): Error en la columna '${fieldName}'. ${payloadIssue.message}`);
              toast.error(`Fila ${rowIndex + 2} (email: ${failingEmail}): Error en la columna '${fieldName}'.`, { 
                id: toastId, 
                description: payloadIssue.message 
              });
              return;
            }
          }
          toast.error("Error al subir las respuestas.", { id: toastId, description: "Revisa el formato del archivo y la consola del navegador." });
          setErrorMessage("Error al subir las respuestas. Revisa el formato del archivo y la consola del navegador.");
        }
      },
      error: () => {
        setStatus('error');
        setErrorMessage("No se pudo leer el archivo CSV.");
        toast.error("No se pudo leer el archivo CSV.");
      }
    });
  }, [examId, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    maxSize: 2 * 1024 * 1024, // 2MB límite
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection?.errors?.find(e => e.code === 'file-too-large')) {
        toast.error('Archivo demasiado grande', { 
          description: 'El archivo CSV no puede superar 2MB.' 
        });
      } else {
        toast.error('Archivo no válido', { 
          description: 'Solo se permiten archivos CSV.' 
        });
      }
    },
  });

  const getStatusContent = () => (
    <div className="flex flex-col items-center gap-3">
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium mb-2">
          {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo CSV aquí o haz clic para seleccionar'}
        </p>
      </div>
    </div>
  );

  return (
    <div
      {...getRootProps()}
      className={`p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'}`}
    >
      <input {...getInputProps()} />
      {getStatusContent()}
    </div>
  );
}