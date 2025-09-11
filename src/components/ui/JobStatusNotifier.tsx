"use client";

import { useJobStatus } from '@/infrastructure/jobs/JobStatusProvider';
import { Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function JobStatusNotifier() {
  const { activeJobs } = useJobStatus();

  const getJobMessage = (job: { type: string; examTitle: string; }) => {
    if (job.type === 'grading') {
      return `Corrigiendo "${job.examTitle}" con IA...`;
    }
    if (job.type === 'csv-upload') {
        return `Procesando CSV para "${job.examTitle}"...`;
    }
    return "Procesando...";
  };

  return (
    <AnimatePresence>
      {activeJobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 z-50 w-full max-w-sm"
        >
          <div className="p-4 bg-card border rounded-md shadow-xl space-y-2">
            <h3 className="font-semibold text-sm">Procesos en segundo plano</h3>
            {activeJobs.map(job => (
              <div key={job.id} className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin text-primary" />
                <span>{getJobMessage(job)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}