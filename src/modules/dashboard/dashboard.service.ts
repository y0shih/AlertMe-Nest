import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { Staff } from '../../entities/staff.entity';
import { SosReport } from '../../entities/sos-report.entity';
import { ReportStatus, StaffStatus } from '../../enums/user-role.enum';
import {
	DashboardResponseDto,
	DashboardStatsDto,
	DashboardGraphsDto,
	TimeSeriesStatusCount,
	TimeSeriesSosCount,
	DashboardQueryDto,
	TimeRangeType,
	GraphTimeType,
} from '../../dto/dashboard.dto';

@Injectable()
export class DashboardService {
	constructor(
		@InjectRepository(Report)
		private reportRepository: Repository<Report>,
		@InjectRepository(Staff)
		private staffRepository: Repository<Staff>,
		@InjectRepository(SosReport)
		private sosReportRepository: Repository<SosReport>,
	) {}

	/**
	 * Get complete dashboard data with statistics and graphs
	 */
	async getDashboardData(query: DashboardQueryDto): Promise<DashboardResponseDto> {
		const { startDate, endDate, rangeType } = this.calculateDateRange(query);

		const [stats, graphs] = await Promise.all([this.getStatistics(startDate, endDate), this.getGraphsData(startDate, endDate, rangeType)]);

		return {
			stats,
			graphs,
			filters: {
				rangeType,
				startDate,
				endDate,
			},
		};
	}

	/**
	 * Calculate date range based on query parameters
	 */
	private calculateDateRange(query: DashboardQueryDto): {
		startDate: Date;
		endDate: Date;
		rangeType: TimeRangeType;
	} {
		const now = new Date();

		// If specific date is provided
		if (query.date) {
			const date = new Date(query.date);
			const startDate = new Date(date);
			startDate.setHours(0, 0, 0, 0);
			const endDate = new Date(date);
			endDate.setHours(23, 59, 59, 999);
			return { startDate, endDate, rangeType: TimeRangeType.DAY };
		}

		// If specific month is provided
		if (query.month) {
			const [year, month] = query.month.split('-').map(Number);
			const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
			const endDate = new Date(year, month, 0, 23, 59, 59, 999);
			return { startDate, endDate, rangeType: TimeRangeType.MONTH };
		}

		// If specific year is provided
		if (query.year) {
			const year = parseInt(query.year, 10);
			const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
			const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
			return { startDate, endDate, rangeType: TimeRangeType.YEAR };
		}

		// Default to today if rangeType is specified or no params
		if (query.rangeType === TimeRangeType.DAY || !query.rangeType) {
			const startDate = new Date(now);
			startDate.setHours(0, 0, 0, 0);
			const endDate = new Date(now);
			endDate.setHours(23, 59, 59, 999);
			return { startDate, endDate, rangeType: TimeRangeType.DAY };
		}

		// Current month
		if (query.rangeType === TimeRangeType.MONTH) {
			const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
			return { startDate, endDate, rangeType: TimeRangeType.MONTH };
		}

		// Current year
		const startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
		const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
		return { startDate, endDate, rangeType: TimeRangeType.YEAR };
	}

	/**
	 * Calculate dashboard statistics
	 */
	private async getStatistics(startDate: Date, endDate: Date): Promise<DashboardStatsDto> {
		// Get total report count
		const totalReport = await this.reportRepository.count();

		// Get active staff count
		const activeStaff = await this.staffRepository.count({
			where: { status: StaffStatus.ACTIVE },
		});

		// Get reports resolved in the period
		const resolvedReportInPeriod = await this.reportRepository.count({
			where: {
				status: ReportStatus.RESOLVED,
				updated_at: Between(startDate, endDate),
			},
		});

		// Calculate average report solving time
		const averageReportSolvingTime = await this.calculateAverageResolutionTime();

		return {
			totalReport,
			activeStaff,
			resolvedReportInPeriod,
			averageReportSolvingTime,
		};
	}

	/**
	 * Calculate average time to resolve reports in hours
	 */
	private async calculateAverageResolutionTime(): Promise<number> {
		const resolvedReports = await this.reportRepository
			.createQueryBuilder('report')
			.select('report.created_at', 'created_at')
			.addSelect('report.updated_at', 'updated_at')
			.where('report.status = :status', { status: ReportStatus.RESOLVED })
			.getRawMany();

		if (resolvedReports.length === 0) {
			return 0;
		}

		const totalHours = resolvedReports.reduce((sum, report) => {
			const createdAt = new Date(report.created_at as string);
			const resolvedAt = new Date(report.updated_at as string);
			const diffInMs = resolvedAt.getTime() - createdAt.getTime();
			const diffInHours = diffInMs / (1000 * 60 * 60);
			return sum + diffInHours;
		}, 0);

		return Math.round((totalHours / resolvedReports.length) * 100) / 100;
	}

	/**
	 * Get graphs data for report distribution
	 */
	private async getGraphsData(startDate: Date, endDate: Date, rangeType: TimeRangeType): Promise<DashboardGraphsDto> {
		const [reportStatusByTime, sosReportByTime] = await Promise.all([
			this.getReportStatusByTime(startDate, endDate, rangeType),
			this.getSosReportStatusByTime(startDate, endDate, rangeType),
		]);

		return {
			reportStatusByTime,
			sosReportByTime,
		};
	}

	/**
	 * Get report status distribution by time period
	 */
	private async getReportStatusByTime(startDate: Date, endDate: Date, rangeType: TimeRangeType): Promise<TimeSeriesStatusCount[]> {
		const { extractClause, graphType, maxTime } = this.getTimeExtractionConfig(rangeType);

		// Query reports in the date range with their status
		const reports = await this.reportRepository
			.createQueryBuilder('report')
			.select(extractClause, 'time')
			.addSelect('report.status', 'status')
			.addSelect('COUNT(*)', 'count')
			.where('report.created_at >= :startDate', { startDate })
			.andWhere('report.created_at <= :endDate', { endDate })
			.groupBy(extractClause)
			.addGroupBy('report.status')
			.getRawMany();

		// Initialize all time periods with zero counts
		const timeData: Map<number, TimeSeriesStatusCount> = new Map();
		const startTime = rangeType === TimeRangeType.DAY ? 1 : 1;
		for (let time = startTime; time <= maxTime; time++) {
			timeData.set(time, {
				time,
				type: graphType,
				pending: 0,
				in_progress: 0,
				resolved: 0,
			});
		}

		// Fill in actual data
		reports.forEach((row) => {
			const time = parseInt(row.time as string, 10);
			if (time >= startTime && time <= maxTime) {
				const data = timeData.get(time);
				if (data) {
					const count = parseInt(row.count as string, 10);
					switch (row.status) {
						case ReportStatus.PENDING:
							data.pending = count;
							break;
						case ReportStatus.IN_PROGRESS:
							data.in_progress = count;
							break;
						case ReportStatus.RESOLVED:
							data.resolved = count;
							break;
					}
				}
			}
		});

		// Convert map to sorted array
		return Array.from(timeData.values()).sort((a, b) => a.time - b.time);
	}

	/**
	 * Get SOS vs Normal report distribution by time period
	 */
	private async getSosReportStatusByTime(startDate: Date, endDate: Date, rangeType: TimeRangeType): Promise<TimeSeriesSosCount[]> {
		const reportConfig = this.getTimeExtractionConfig(rangeType, 'report');
		const sosConfig = this.getTimeExtractionConfig(rangeType, 'sos');

		// Query normal reports in the date range
		const normalReports = await this.reportRepository
			.createQueryBuilder('report')
			.select(reportConfig.extractClause, 'time')
			.addSelect('COUNT(*)', 'count')
			.where('report.created_at >= :startDate', { startDate })
			.andWhere('report.created_at <= :endDate', { endDate })
			.groupBy(reportConfig.extractClause)
			.getRawMany();

		// Query SOS reports in the date range
		const sosReports = await this.sosReportRepository
			.createQueryBuilder('sos')
			.select(sosConfig.extractClause, 'time')
			.addSelect('COUNT(*)', 'count')
			.where('sos.created_at >= :startDate', { startDate })
			.andWhere('sos.created_at <= :endDate', { endDate })
			.groupBy(sosConfig.extractClause)
			.getRawMany();

		// Initialize all time periods with zero counts
		const timeData: Map<number, TimeSeriesSosCount> = new Map();
		const startTime = rangeType === TimeRangeType.DAY ? 1 : 1;
		for (let time = startTime; time <= reportConfig.maxTime; time++) {
			timeData.set(time, {
				time,
				type: reportConfig.graphType,
				normalReport: 0,
				sosReport: 0,
			});
		}

		// Fill in normal reports data
		normalReports.forEach((row) => {
			const time = parseInt(row.time as string, 10);
			if (time >= startTime && time <= reportConfig.maxTime) {
				const data = timeData.get(time);
				if (data) {
					data.normalReport = parseInt(row.count as string, 10);
				}
			}
		});

		// Fill in SOS reports data
		sosReports.forEach((row) => {
			const time = parseInt(row.time as string, 10);
			if (time >= startTime && time <= reportConfig.maxTime) {
				const data = timeData.get(time);
				if (data) {
					data.sosReport = parseInt(row.count as string, 10);
				}
			}
		});

		// Convert map to sorted array
		return Array.from(timeData.values()).sort((a, b) => a.time - b.time);
	}

	/**
	 * Get time extraction configuration based on range type
	 */
	private getTimeExtractionConfig(
		rangeType: TimeRangeType,
		tableName: string = 'report',
	): {
		extractClause: string;
		graphType: GraphTimeType;
		maxTime: number;
	} {
		switch (rangeType) {
			case TimeRangeType.DAY:
				return {
					extractClause: `EXTRACT(HOUR FROM ${tableName}.created_at)`,
					graphType: GraphTimeType.HOUR,
					maxTime: 23,
				};
			case TimeRangeType.MONTH:
				return {
					extractClause: `EXTRACT(DAY FROM ${tableName}.created_at)`,
					graphType: GraphTimeType.DAY,
					maxTime: 31,
				};
			case TimeRangeType.YEAR:
				return {
					extractClause: `EXTRACT(MONTH FROM ${tableName}.created_at)`,
					graphType: GraphTimeType.MONTH,
					maxTime: 12,
				};
			default:
				return {
					extractClause: `EXTRACT(HOUR FROM ${tableName}.created_at)`,
					graphType: GraphTimeType.HOUR,
					maxTime: 23,
				};
		}
	}
}
