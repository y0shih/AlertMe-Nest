import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface UploadResult {
	publicUrl: string;
}

export interface MultipleUploadResult {
	files: UploadResult[];
	count: number;
}

@Injectable()
export class StorageService {
	private supabase: SupabaseClient;
	private bucketName: string;

	constructor(private configService: ConfigService) {
		const supabaseUrl = this.configService.get<string>('supabase.url');
		const supabaseKey = this.configService.get<string>('supabase.serviceRoleKey') || this.configService.get<string>('supabase.anonKey');

		if (!supabaseUrl || !supabaseKey) {
			throw new Error('Supabase configuration is missing');
		}

		this.supabase = createClient(supabaseUrl, supabaseKey);
		this.bucketName = this.configService.get<string>('supabase.storage.bucket') || 'report-attachments';
	}

	/**
	 * Upload a file to Supabase Storage
	 * @param file - File buffer to upload
	 * @param filename - Original filename
	 * @param folder - Optional folder path (e.g., 'reports', 'responses')
	 * @returns Upload result with path and public URL
	 */
	async uploadFile(file: Buffer, filename: string, folder: string = 'uploads'): Promise<UploadResult> {
		try {
			// Validate file size (max 10MB)
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (file.length > maxSize) {
				throw new BadRequestException('File size exceeds 10MB limit');
			}

			// Validate file type (images only)
			const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
			const fileExtension = this.getFileExtension(filename);
			const mimeType = this.getMimeType(fileExtension);

			if (!allowedMimeTypes.includes(mimeType)) {
				throw new BadRequestException('Only image files (JPEG, PNG, GIF, WEBP) are allowed');
			}

			// Generate unique filename
			const uniqueFilename = `${randomUUID()}-${Date.now()}${fileExtension}`;
			const filePath = `${folder}/${uniqueFilename}`;

			// Upload to Supabase Storage
			const { data, error } = await this.supabase.storage.from(this.bucketName).upload(filePath, file, {
				contentType: mimeType,
				upsert: false,
			});

			if (error) {
				console.error('Supabase upload error:', error);
				throw new InternalServerErrorException('Failed to upload file to storage');
			}

			// Get public URL
			const {
				data: { publicUrl },
			} = this.supabase.storage.from(this.bucketName).getPublicUrl(data.path);

			return {
				publicUrl,
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			console.error('Upload error:', error);
			throw new InternalServerErrorException('Failed to upload file');
		}
	}

	/**
	 * Delete a file from Supabase Storage
	 * @param filePath - Path of the file to delete
	 */
	async deleteFile(filePath: string): Promise<void> {
		try {
			const { error } = await this.supabase.storage.from(this.bucketName).remove([filePath]);

			if (error) {
				console.error('Supabase delete error:', error);
				throw new InternalServerErrorException('Failed to delete file from storage');
			}
		} catch (error) {
			console.error('Delete error:', error);
			throw new InternalServerErrorException('Failed to delete file');
		}
	}

	/**
	 * List files in a folder from Supabase Storage
	 * @param folder - Folder path (e.g., 'uploads', 'reports')
	 * @returns List of files with their public URLs
	 */
	async listFiles(folder: string = 'uploads'): Promise<{ files: Array<{ publicUrl: string; createdAt: string }> }> {
		try {
			const { data, error } = await this.supabase.storage.from(this.bucketName).list(folder, {
				sortBy: { column: 'created_at', order: 'desc' },
			});

			if (error) {
				console.error('Supabase list error:', error);
				throw new InternalServerErrorException('Failed to list files from storage');
			}

			const files = data.map((file) => {
				const filePath = `${folder}/${file.name}`;
				const publicUrl = this.getPublicUrl(filePath);
				return {
					publicUrl,
					createdAt: file.created_at,
				};
			});

			return { files };
		} catch (error) {
			console.error('List files error:', error);
			throw new InternalServerErrorException('Failed to list files');
		}
	}

	/**
	 * Upload multiple files to Supabase Storage
	 * @param files - Array of file buffers with metadata
	 * @param folder - Optional folder path (e.g., 'reports', 'responses')
	 * @returns Upload results with paths and public URLs for all files
	 */
	async uploadMultipleFiles(files: Array<{ buffer: Buffer; filename: string }>, folder: string = 'uploads'): Promise<MultipleUploadResult> {
		try {
			if (!files || files.length === 0) {
				throw new BadRequestException('No files provided');
			}

			// Validate total number of files (max 5 files)
			const maxFiles = 5;
			if (files.length > maxFiles) {
				throw new BadRequestException(`Maximum ${maxFiles} files allowed per upload`);
			}

			const uploadPromises = files.map((file) => this.uploadFile(file.buffer, file.filename, folder));

			const results = await Promise.all(uploadPromises);

			return {
				files: results,
				count: results.length,
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			console.error('Multiple upload error:', error);
			throw new InternalServerErrorException('Failed to upload files');
		}
	}

	/**
	 * Get public URL for a file
	 * @param filePath - Path of the file
	 * @returns Public URL
	 */
	getPublicUrl(filePath: string): string {
		const {
			data: { publicUrl },
		} = this.supabase.storage.from(this.bucketName).getPublicUrl(filePath);
		return publicUrl;
	}

	/**
	 * Get file extension from filename
	 */
	private getFileExtension(filename: string): string {
		const lastDot = filename.lastIndexOf('.');
		return lastDot !== -1 ? filename.substring(lastDot) : '';
	}

	/**
	 * Get MIME type from file extension
	 */
	private getMimeType(extension: string): string {
		const mimeTypes: Record<string, string> = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp',
		};
		return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
	}
}
