export const statusTranslations: { [key: string]: string } = {
    DRAFT: 'Borrador',
    PUBLISHED: 'Publicado',
    EVALUATED: 'Evaluado',
    UNGRADED: 'Sin Corregir',
    GRADED_DRAFT: 'Borrador',
    GRADED_FINAL: 'Finalizado',
};

export const translateStatus = (status: string): string => {
    return statusTranslations[status] || status;
};