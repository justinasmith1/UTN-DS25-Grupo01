export type TipoFile =  'BOLETO' | 'ESCRITURA' | 'PLANO' | 'IMAGEN' | 'OTRO';
export type EstadoOperativoFile = 'OPERATIVO' | 'ELIMINADO';

export interface FileMetadata {
    id: number;
    filename: string;
    url: string;
    tipo: TipoFile;
    uploadedAt: Date;
    updatedAt: Date;
    uploadedBy?: string | null;
    idLoteAsociado: number;
    ventaId?: number | null;
    estadoOperativo: EstadoOperativoFile;
    deletedBy?: string | null;
}

export interface NewFileMetadata {
    filename: string;
    url: string;
    tipo: TipoFile;
    uploadedBy?: string | null;
    idLoteAsociado: number;
    ventaId?: number | null;
}

export interface UpdateFileMetadata {
    filename?: string;
    url?: string;
    tipo?: TipoFile;
    uploadedBy?: string | null;
    idLoteAsociado?: number;
    ventaId?: number | null;
}

export interface DeleteFileMetadata {
    id: number;
}

