import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { ReportStatus } from '../../enums/user-role.enum';

@Injectable()
export class ReportsService {
	constructor(
		@InjectRepository(Report)
		private reportRepository: Repository<Report>,
	) {}

	async findAll(): Promise<Report[]> {
		return this.reportRepository.find({
			relations: ['user', 'tasks', 'responses'],
			order: { created_at: 'DESC' },
		});
	}

	async findById(id: string): Promise<Report | null> {
		return this.reportRepository.findOne({
			where: { id },
			relations: ['user', 'tasks', 'responses'],
		});
	}

	async findByUserId(userId: string): Promise<Report[]> {
		return this.reportRepository.find({
			where: { user_id: userId },
			relations: ['user', 'tasks', 'responses'],
			order: { created_at: 'DESC' },
		});
	}

	async findByStatus(status: ReportStatus): Promise<Report[]> {
		return this.reportRepository.find({
			where: { status },
			relations: ['user', 'tasks'],
			order: { created_at: 'DESC' },
		});
	}

	async create(reportData: Partial<Report>): Promise<Report> {
		const report = this.reportRepository.create(reportData);
		return this.reportRepository.save(report);
	}

	async update(id: string, updateData: Partial<Report>): Promise<Report | null> {
		await this.reportRepository.update(id, updateData);
		return this.findById(id);
	}

	async remove(id: string): Promise<void> {
		await this.reportRepository.delete(id);
	}
}
