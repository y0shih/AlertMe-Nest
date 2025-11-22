import { Controller, Get, Post, Delete, Body, Query, UseInterceptors, UploadedFiles, BadRequestException, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppService } from './app.service';
import { StorageService, MultipleUploadResult } from './modules/storage/storage.service';
import { SupabaseAuthGuard } from './modules/auth/supabase-auth.guard';

@ApiTags('App')
@Controller()
export class AppController {
	constructor(
		private readonly appService: AppService,
		private readonly storageService: StorageService,
	) { }

	@Get()
	@ApiOperation({ summary: 'Health check' })
	getHello(): string {
		return this.appService.getHello();
	}

	@Get('upload')
	@ApiBearerAuth('JWT-auth')
	@UseGuards(SupabaseAuthGuard)
	@ApiOperation({ summary: 'List files from Supabase Storage' })
	@ApiQuery({
		name: 'folder',
		required: false,
		description: 'Folder name to list files from (e.g., "reports", "responses")',
		example: 'uploads',
	})
	async listFiles(@Query('folder') folder?: string): Promise<{ files: Array<{ publicUrl: string; createdAt: string }> }> {
		return this.storageService.listFiles(folder || 'uploads');
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

	@Delete('upload')
	@ApiBearerAuth('JWT-auth')
	@UseGuards(SupabaseAuthGuard)
	@ApiOperation({ summary: 'Delete an image from Supabase Storage by URL' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				url: {
					type: 'string',
					description: 'Full public URL of the image to delete',
					example: 'https://xxx.supabase.co/storage/v1/object/public/report-attachments/uploads/abc123.jpg',
				},
			},
			required: ['url'],
		},
	})
	async deleteFile(@Body('url') url: string): Promise<{ message: string }> {
		if (!url) {
			throw new BadRequestException('URL is required');
		}

		// Extract the file path from the public URL
		// URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
		const urlParts = url.split('/storage/v1/object/public/');
		if (urlParts.length !== 2) {
			throw new BadRequestException('Invalid storage URL format');
		}

		const pathWithBucket = urlParts[1];
		const pathParts = pathWithBucket.split('/');

		// Remove the bucket name from the path
		if (pathParts.length < 2) {
			throw new BadRequestException('Invalid file path in URL');
		}

		pathParts.shift(); // Remove bucket name
		const filePath = pathParts.join('/');

		await this.storageService.deleteFile(filePath);

		return { message: 'File deleted successfully' };
	}
}
