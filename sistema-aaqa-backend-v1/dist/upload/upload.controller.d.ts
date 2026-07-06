interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    filename?: string;
}
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: any);
    uploadExcel(file: MulterFile, req: any): Promise<any>;
    uploadFisParticipantsExcel(file: MulterFile, req: any): Promise<any>;
    uploadCommunityCortesExcel(file: MulterFile, req: any): Promise<any>;
    uploadMedia(file: MulterFile, req: any): Promise<{
        success: boolean;
        url: string;
    }>;
    deleteMedia(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
