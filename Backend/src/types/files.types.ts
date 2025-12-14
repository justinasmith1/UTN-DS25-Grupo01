export type TipoFile =  'BOLETO' | 'ESCRITURA' | 'PLANO' | 'IMAGEN' | 'OTRO';
export interface FileMetadata {
    id: number;
    filename: string;
    url: string;
    tipo: TipoFile;
    uploadedAt: Date;
    uploadedBy?: string | null;
    idLoteAsociado: number;
}

export interface NewFileMetadata {
    filename: string;
    url: string;
    tipo: TipoFile;
    uploadedBy?: string | null;
    idLoteAsociado: number;
}

export interface UpdateFileMetadata {
    filename?: string;
    url?: string;
    tipo?: TipoFile;
    uploadedBy?: string | null;
    idLoteAsociado?: number;
}

export interface DeleteFileMetadata {
    id: number;
}

