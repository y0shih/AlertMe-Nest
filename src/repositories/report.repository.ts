import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Report } from '../entities/report.entity';
import { ReportStatus } from '../enums/user-role.enum';

@Injectable()
export class ReportRepository extends Repository<Report> {
	constructor(private dataSource: DataSource) {
		super(Report, dataSource.createEntityManager());
	}

	async findByUserId(userId: string): Promise<Report[]> {
		return this.find({
			where: { user_id: userId },
			relations: ['user', 'tasks', 'responses'],
			order: { created_at: 'DESC' },
		});
	}

	async findByStatus(status: ReportStatus): Promise<Report[]> {
		return this.find({
			where: { status },
			relations: ['user', 'tasks'],
			order: { created_at: 'DESC' },
		});
	}

	async findReportsWithLocation(lat: number, lng: number, radius: number): Promise<Report[]> {
		// Note: This is a simplified version - in production you'd use PostGIS for proper geospatial queries
		return this.createQueryBuilder('report')
			.where(
				`ST_DWithin(
          ST_MakePoint(:lng, :lat)::geography,
          ST_MakePoint(report.lng, report.lat)::geography,
          :radius
        )`,
				{ lat, lng, radius: radius * 1000 }, // Convert km to meters
			)
			.leftJoinAndSelect('report.user', 'user')
			.orderBy('report.created_at', 'DESC')
			.getMany();
	}
}
