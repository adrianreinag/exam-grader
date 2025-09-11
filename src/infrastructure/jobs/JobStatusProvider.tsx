"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { db } from '../firebase/client';
import { useAuth } from '../auth/AuthProvider';
import { collection, query, where, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useDemo } from '../demo/DemoContext';

export type ActiveJob = {
  id: string;
  examId: string;
  examTitle: string;
  type: 'grading' | 'csv-upload';
  status: 'PENDING' | 'PROCESSING';
};

interface JobStatusContextType {
  activeJobs: ActiveJob[];
  lastCompletedJobId?: string;
}

const JobStatusContext = createContext<JobStatusContextType>({ activeJobs: [] });

export function JobStatusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isDemo = useDemo();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [lastCompletedJobId, setLastCompletedJobId] = useState<string | undefined>();
  const [processedInitialLoad, setProcessedInitialLoad] = useState(false);

  const handleJobCompletion = useCallback((job: DocumentData, isInitialLoad: boolean) => {
    const completedAt = (job.completedAt as Timestamp)?.toDate();
    const now = new Date();
    const wasCompletedRecently = completedAt && (now.getTime() - completedAt.getTime()) < 30000;

    if (!isInitialLoad && wasCompletedRecently) {
      if (job.status === 'COMPLETED') {
        toast.success(`Proceso finalizado: ${job.examTitle}`);
      } else if (job.status === 'FAILED') {
        const error = job.error || "Ocurrió un error inesperado.";
        
        if (error.includes('INVALID_API_KEY') || error.includes('MISSING_API_KEY')) {
          toast.error(`Error de Clave API: ${job.examTitle}`, {
            description: error.includes('INVALID_API_KEY') 
              ? "Tu clave API de OpenAI es inválida. Verifica tu configuración."
              : "No se encontró una clave API de OpenAI válida. Configúrala en tu perfil.",
            duration: 8000,
          });
        } else {
          toast.error(`Falló el proceso: ${job.examTitle}`, {
            description: error,
          });
        }
      }
    }
    
    setLastCompletedJobId(job.examId + Date.now());
  }, []);

  useEffect(() => {
    if (!user || isDemo) {
      setActiveJobs([]);
      setProcessedInitialLoad(false);
      return;
    }

    const jobCollections = ['gradingJobs', 'csvUploadJobs'];
    
    const unsubscribes = jobCollections.map(col => {
      const q = query(
        collection(db, col),
        where('ownerUid', '==', user.uid),
        where('status', 'in', ['PENDING', 'PROCESSING'])
      );

      return onSnapshot(q, (snapshot) => {
        const currentJobs: ActiveJob[] = [];
        snapshot.docs.forEach(doc => {
          const jobData = doc.data();
          currentJobs.push({
            id: doc.id,
            examId: jobData.examId,
            examTitle: jobData.examTitle,
            type: col === 'gradingJobs' ? 'grading' : 'csv-upload',
            status: jobData.status,
          });
        });
        
        setActiveJobs(prevJobs => {
            const otherJobs = prevJobs.filter(j => (j.type === 'grading' ? 'gradingJobs' : 'csv-upload') !== col);
            return [...otherJobs, ...currentJobs];
        });

        if (!processedInitialLoad) {
          const qCompleted = query(
            collection(db, col),
            where('ownerUid', '==', user.uid),
            where('status', 'in', ['COMPLETED', 'FAILED'])
          );
          
          const unsubCompleted = onSnapshot(qCompleted, (completedSnapshot) => {
            completedSnapshot.docChanges().forEach(change => {
              if (change.type === 'added' || change.type === 'modified') {
                handleJobCompletion(change.doc.data(), false);
              }
            });
          });
          
          return () => unsubCompleted();
        }
      });
    });

    setProcessedInitialLoad(true);
    const allUnsubs = [...unsubscribes];
    return () => allUnsubs.forEach(unsub => unsub && unsub());
  }, [user, isDemo, handleJobCompletion, processedInitialLoad]);

  return (
    <JobStatusContext.Provider value={{ activeJobs, lastCompletedJobId }}>
      {children}
    </JobStatusContext.Provider>
  );
}

export const useJobStatus = () => useContext(JobStatusContext);