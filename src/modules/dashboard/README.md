# Dashboard Module

This module provides comprehensive dashboard statistics and analytics for the Repora application.

## Overview

The Dashboard Module delivers real-time metrics and time-series data for monitoring report activities, staff performance, and system health.

## API Endpoints

### GET `/dashboard`

Retrieves complete dashboard data including statistics and hourly graphs.

**Authorization:** Required (Admin, SuperAdmin roles only)

**Response Schema:**

```json
{
  "stats": {
    "totalReport": 150,
    "activeStaff": 25,
    "resolvedReportToday": 12,
    "averageReportSolvingTime": 24.5
  },
  "graphs": {
    "reportStatusHour": [
      {
        "hour": 1,
        "pending": 5,
        "in_progress": 3,
        "resolved": 2
      },
      {
        "hour": 2,
        "pending": 7,
        "in_progress": 4,
        "resolved": 1
      }
      // ... continues for hours 1-23
    ],
    "sosReportStatusHour": [
      {
        "hour": 1,
        "normalReport": 8,
        "sosReport": 2
      },
      {
        "hour": 2,
        "normalReport": 10,
        "sosReport": 3
      }
      // ... continues for hours 1-23
    ]
  }
}
```

## Dashboard Statistics

### 1. Total Reports (`totalReport`)
- **Description:** Total count of all reports in the system
- **Calculation:** Count of all records in `reports` table
- **Type:** Integer

### 2. Active Staff (`activeStaff`)
- **Description:** Number of staff members with active status
- **Calculation:** Count of staff where `status = 'active'`
- **Type:** Integer

### 3. Resolved Reports Today (`resolvedReportToday`)
- **Description:** Number of reports resolved within the current day (00:00 - 23:59)
- **Calculation:** Count of reports with `status = 'resolved'` and `updated_at` within today
- **Type:** Integer

### 4. Average Report Solving Time (`averageReportSolvingTime`)
- **Description:** Average time taken to resolve reports, measured in hours
- **Calculation:** Average of `(updated_at - created_at)` for all resolved reports
- **Type:** Float (rounded to 2 decimal places)
- **Unit:** Hours

## Dashboard Graphs

### 1. Report Status by Hour (`reportStatusHour`)

**Purpose:** Track report status distribution throughout the day

**Time Range:** Hours 1-23 (1:00 AM to 11:00 PM)

**Data Points:**
- `hour`: Hour of the day (1-23)
- `pending`: Count of pending reports created in that hour
- `in_progress`: Count of in-progress reports created in that hour
- `resolved`: Count of resolved reports created in that hour

**Note:** Data is based on reports created TODAY (filtered by `created_at >= today 00:00`)

**Use Case:** Identify peak hours for report creation and resolution patterns

### 2. SOS vs Normal Reports by Hour (`sosReportStatusHour`)

**Purpose:** Compare emergency (SOS) vs regular report distribution

**Time Range:** Hours 1-23 (1:00 AM to 11:00 PM)

**Data Points:**
- `hour`: Hour of the day (1-23)
- `normalReport`: Count of regular reports from `reports` table
- `sosReport`: Count of SOS reports from `sos_reports` table

**Note:** Data is based on reports created TODAY (filtered by `created_at >= today 00:00`)

**Use Case:** Monitor emergency response patterns and peak emergency hours

## Implementation Details

### Service Layer (`dashboard.service.ts`)

The service implements efficient database queries with the following optimizations:

1. **Parallel Execution:** Statistics and graphs are calculated concurrently using `Promise.all()`
2. **Query Optimization:** Uses TypeORM query builder for efficient aggregations
3. **Hour Initialization:** Pre-initializes all hours (1-23) with zero values to ensure consistent graph data

### Key Methods

#### `getDashboardData()`
Main entry point that returns complete dashboard data

#### `getStatistics()`
Calculates all statistical metrics in parallel

#### `calculateAverageResolutionTime()`
Computes average resolution time from resolved reports

#### `getReportStatusByHour()`
Aggregates report status counts grouped by hour of creation

#### `getSosReportStatusByHour()`
Aggregates normal vs SOS report counts grouped by hour

## Database Queries

### Active Staff Query
```sql
SELECT COUNT(*) FROM staff WHERE status = 'active'
```

### Resolved Reports Today Query
```sql
SELECT COUNT(*) FROM reports 
WHERE status = 'resolved' 
AND updated_at >= CURRENT_DATE 
AND updated_at < CURRENT_DATE + INTERVAL '1 day'
```

### Hourly Report Status Query
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  status,
  COUNT(*) as count
FROM reports
WHERE created_at >= CURRENT_DATE 
AND created_at < CURRENT_DATE + INTERVAL '1 day'
GROUP BY EXTRACT(HOUR FROM created_at), status
```

## Usage Example

### cURL Request
```bash
curl -X GET http://localhost:3000/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3000/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const dashboardData = await response.json();
console.log('Total Reports:', dashboardData.stats.totalReport);
console.log('Active Staff:', dashboardData.stats.activeStaff);
```

## Access Control

- **Allowed Roles:** `admin`, `superadmin`
- **Authentication:** Required (JWT Bearer Token)
- **Guard Chain:** `SupabaseAuthGuard` → `RolesGuard`

## Future Enhancements

Potential improvements for future versions:

1. **Date Range Filtering:** Allow custom date ranges for graphs
2. **Staff Performance Metrics:** Individual staff resolution times and completion rates
3. **Geographic Heatmap Data:** Report distribution by location
4. **Trend Analysis:** Week-over-week, month-over-month comparisons
5. **Real-time Updates:** WebSocket integration for live dashboard updates
6. **Export Functionality:** CSV/PDF export of dashboard data
7. **Caching Layer:** Redis caching for frequently accessed metrics

## Testing

### Unit Tests
Test individual service methods with mocked repositories

### Integration Tests
Test complete dashboard endpoint with test database

### Example Test Case
```typescript
describe('DashboardService', () => {
  it('should calculate correct average resolution time', async () => {
    const result = await service.getDashboardData();
    expect(result.stats.averageReportSolvingTime).toBeGreaterThanOrEqual(0);
  });

  it('should return 23 hours for reportStatusHour graph', async () => {
    const result = await service.getDashboardData();
    expect(result.graphs.reportStatusHour).toHaveLength(23);
  });
});
```

## Dependencies

- `@nestjs/common`: Core NestJS functionality
- `@nestjs/typeorm`: TypeORM integration
- `typeorm`: Database ORM
- Entity dependencies: `Report`, `Staff`, `SosReport`

## Error Handling

The service handles the following edge cases:

1. **No Resolved Reports:** Returns `0` for average solving time
2. **Missing Hours:** Initializes all hours with zero counts for consistent graph rendering
3. **Database Errors:** Propagates to controller for proper HTTP error responses

## Performance Considerations

- **Query Efficiency:** Uses aggregations at database level rather than application level
- **Parallel Processing:** Concurrent execution of independent queries
- **Index Recommendations:** 
  - `reports.created_at` (for hourly queries)
  - `reports.status` (for status filtering)
  - `reports.updated_at` (for today's resolved reports)
  - `staff.status` (for active staff count)
  - `sos_reports.created_at` (for hourly SOS queries)

## Monitoring

Recommended metrics to track:

- Response time of `/dashboard` endpoint
- Database query execution times
- Cache hit rates (if caching implemented)
- Dashboard access frequency by role