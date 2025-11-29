import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum TimeRangeType {
	DAY = 'day',
	MONTH = 'month',
	YEAR = 'year',
}

export enum GraphTimeType {
	HOUR = 'hour',
	DAY = 'day',
	WEEK = 'week',
	MONTH = 'month',
}

export class DashboardQueryDto {
	@ApiPropertyOptional({
		enum: TimeRangeType,
		description: 'Time range filter type',
		example: 'day',
	})
	@IsOptional()
	@IsEnum(TimeRangeType)
	rangeType?: TimeRangeType;

	@ApiPropertyOptional({
		description: 'Specific date for filtering (YYYY-MM-DD format)',
		example: '2024-01-15',
	})
	@IsOptional()
	@IsDateString()
	date?: string;

	@ApiPropertyOptional({
		description: 'Specific month for filtering (YYYY-MM format)',
		example: '2024-01',
	})
	@IsOptional()
	month?: string;

	@ApiPropertyOptional({
		description: 'Specific year for filtering (YYYY format)',
		example: '2024',
	})
	@IsOptional()
	year?: string;
}

export class DashboardStatsDto {
	@ApiProperty({ description: 'Total number of reports', example: 150 })
	totalReport: number;

	@ApiProperty({ description: 'Number of active staff members', example: 25 })
	activeStaff: number;

	@ApiProperty({ description: 'Number of reports resolved in the selected period', example: 12 })
	resolvedReportInPeriod: number;

	@ApiProperty({ description: 'Average time to solve a report in hours', example: 24.5 })
	averageReportSolvingTime: number;
}

export class TimeSeriesStatusCount {
	@ApiProperty({ description: 'Time value (hour: 1-23, day: 1-31, week: 1-52, month: 1-12)', example: 14 })
	time: number;

	@ApiProperty({
		enum: GraphTimeType,
		description: 'Type of time granularity',
		example: 'hour',
	})
	type: GraphTimeType;

	@ApiProperty({ description: 'Number of pending reports', example: 5 })
	pending: number;

	@ApiProperty({ description: 'Number of in-progress reports', example: 8 })
	in_progress: number;

	@ApiProperty({ description: 'Number of resolved reports', example: 3 })
	resolved: number;
}

export class TimeSeriesSosCount {
	@ApiProperty({ description: 'Time value (hour: 1-23, day: 1-31, week: 1-52, month: 1-12)', example: 14 })
	time: number;

	@ApiProperty({
		enum: GraphTimeType,
		description: 'Type of time granularity',
		example: 'hour',
	})
	type: GraphTimeType;

	@ApiProperty({ description: 'Number of normal reports', example: 10 })
	normalReport: number;

	@ApiProperty({ description: 'Number of SOS reports', example: 2 })
	sosReport: number;
}

export class DashboardGraphsDto {
	@ApiProperty({
		description: 'Report status distribution over time',
		type: [TimeSeriesStatusCount],
	})
	reportStatusByTime: TimeSeriesStatusCount[];

	@ApiProperty({
		description: 'SOS vs Normal report distribution over time',
		type: [TimeSeriesSosCount],
	})
	sosReportByTime: TimeSeriesSosCount[];
}

export class DashboardResponseDto {
	@ApiProperty({ description: 'Dashboard statistics' })
	stats: DashboardStatsDto;

	@ApiProperty({ description: 'Dashboard graphs data' })
	graphs: DashboardGraphsDto;

	@ApiProperty({
		description: 'Applied filters for this response',
		example: { rangeType: 'day', date: '2024-01-15' },
	})
	filters: {
		rangeType: TimeRangeType;
		startDate: Date;
		endDate: Date;
	};
}
