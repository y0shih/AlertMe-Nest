import { Controller, Get, Post, UseInterceptors, UploadedFiles, BadRequestException, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { StorageService, MultipleUploadResult } from './modules/storage/storage.service';
import { SupabaseAuthGuard } from './modules/auth/supabase-auth.guard';

@ApiTags('App')
@Controller()
export class AppController {
	constructor(
		private readonly appService: AppService,
		private readonly storageService: StorageService,
	) {}

	@Get()
	@ApiOperation({ summary: 'Health check' })
	getHello(): string {
		return this.appService.getHello();
	}

	@Post('upload')
	@ApiBearerAuth('JWT-auth')
	@UseGuards(SupabaseAuthGuard)
	@ApiOperation({ summary: 'Upload one or multiple images to Supabase Storage (1-5 files) - returns URLs array' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				files: {
					type: 'array',
					items: {
						type: 'string',
						format: 'binary',
					},
					description: 'Image file(s) (JPEG, PNG, GIF, WEBP) - 1 to 5 files, max 10MB each',
				},
				folder: {
					type: 'string',
					description: 'Optional folder name (e.g., "reports", "responses")',
					default: 'uploads',
				},
			},
			required: ['files'],
		},
	})
	@UseInterceptors(FilesInterceptor('files', 5))
	async uploadFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<MultipleUploadResult> {
		if (!files || files.length === 0) {
			throw new BadRequestException('No files uploaded');
		}

		// Default to 'uploads' folder
		const folder = 'uploads';

		const fileData = files.map((file) => ({
			buffer: file.buffer,
			filename: file.originalname,
		}));

		return this.storageService.uploadMultipleFiles(fileData, folder);
	}
}
