import { Controller, Get, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { StorageService, UploadResult } from './modules/storage/storage.service';
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
	@ApiOperation({ summary: 'Upload image to Supabase Storage - returns URL to use in report/response payloads' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				file: {
					type: 'string',
					format: 'binary',
					description: 'Image file (JPEG, PNG, GIF, WEBP) - max 10MB',
				},
				folder: {
					type: 'string',
					description: 'Optional folder name (e.g., "reports", "responses")',
					default: 'uploads',
				},
			},
			required: ['file'],
		},
	})
	@UseInterceptors(FileInterceptor('file'))
	async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
		if (!file) {
			throw new BadRequestException('No file uploaded');
		}

		// Default to 'uploads' folder, but could be extracted from form data if needed
		const folder = 'uploads';

		return this.storageService.uploadFile(file.buffer, file.originalname, folder);
	}
}
